<?php

use App\Jobs\ImportJiraIssuesJob;
use App\Models\ActivityLog;
use App\Models\IntegrationFieldMapping;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Models\User;
use App\Services\Integrations\Jira\JiraIntegrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = app(JiraIntegrationService::class);
    $this->project = Project::factory()->create();
});

test('connect saves the credentials and tests the connection', function () {
    Http::fake(['*/rest/api/3/myself' => Http::response(['accountId' => 'abc'], 200)]);

    $projectIntegration = $this->service->connect($this->project, [
        'instance_url' => 'https://example.atlassian.net',
        'email' => 'a@b.com',
        'api_token' => 'secret',
    ]);

    expect($projectIntegration->credentials['instance_url'])->toBe('https://example.atlassian.net');
    $this->assertDatabaseHas('activity_logs', [
        'project_id' => $this->project->id,
        'body' => 'Connected the "jira" integration',
    ]);
});

test('connect throws a validation exception when the connection test fails', function () {
    Http::fake(['*/rest/api/3/myself' => Http::response(['message' => 'Unauthorized'], 401)]);

    expect(fn () => $this->service->connect($this->project, [
        'instance_url' => 'https://example.atlassian.net',
        'email' => 'a@b.com',
        'api_token' => 'wrong',
    ]))->toThrow(ValidationException::class);
});

test('saveMappings upserts every mapping and logs one activity entry', function () {
    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'jira',
        'enabled' => true,
        'credentials' => ['instance_url' => 'https://example.atlassian.net', 'email' => 'a@b.com', 'api_token' => 'secret'],
    ]);

    $this->service->saveMappings($projectIntegration, [
        ['mapping_type' => 'status', 'external_value' => 'To Do', 'orbit_value' => 'open', 'external_label' => 'To Do'],
        ['mapping_type' => 'priority', 'external_value' => 'High', 'orbit_value' => 'high'],
    ]);

    expect(IntegrationFieldMapping::where('project_integration_id', $projectIntegration->id)->count())->toBe(2);
    $this->assertDatabaseHas('activity_logs', [
        'project_id' => $this->project->id,
        'body' => 'Updated Jira field mappings',
    ]);
});

test('triggerImport dispatches ImportJiraIssuesJob and logs an activity entry', function () {
    Bus::fake();

    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'jira',
        'enabled' => true,
    ]);
    $user = User::factory()->create();

    $this->service->triggerImport($this->project, $projectIntegration, $user, ['project_key' => 'FE']);

    Bus::assertDispatched(ImportJiraIssuesJob::class, fn ($job) => $job->importedByUserId === $user->id);
    $this->assertDatabaseHas('activity_logs', [
        'project_id' => $this->project->id,
        'user_id' => $user->id,
        'body' => 'Started a Jira import',
    ]);
});

test('getSettingsExtras returns defaults when Jira is not connected', function () {
    $extras = $this->service->getSettingsExtras($this->project);

    expect($extras)->toBe([
        'hasCredentials' => false,
        'instanceUrl' => null,
        'mappingMetadata' => null,
        'fieldMappings' => [],
        'lastImport' => null,
    ]);
});

test('getSettingsExtras returns live metadata, saved mappings, and the last import summary when connected', function () {
    Http::fake([
        '*/rest/api/3/status' => Http::response([['id' => '1', 'name' => 'To Do']], 200),
        '*/rest/api/3/priority' => Http::response([], 200),
        '*/rest/api/3/issuetype' => Http::response([], 200),
    ]);

    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'jira',
        'enabled' => true,
        'credentials' => ['instance_url' => 'https://example.atlassian.net', 'email' => 'a@b.com', 'api_token' => 'secret'],
        'options' => ['last_import' => ['imported' => 3, 'updated' => 1, 'skipped' => 0, 'failed' => 0, 'errors' => [], 'ran_at' => '2026-01-01T00:00:00+00:00']],
    ]);
    $this->service->saveMappings($projectIntegration, [
        ['mapping_type' => 'status', 'external_value' => 'To Do', 'orbit_value' => 'open'],
    ]);

    $extras = $this->service->getSettingsExtras($this->project);

    expect($extras['hasCredentials'])->toBeTrue()
        ->and($extras['instanceUrl'])->toBe('https://example.atlassian.net')
        ->and($extras['mappingMetadata']['statuses'])->toBe([['value' => 'To Do', 'label' => 'To Do']])
        ->and($extras['fieldMappings'])->toHaveCount(1)
        ->and($extras['lastImport'])->toBe(['imported' => 3, 'updated' => 1, 'skipped' => 0, 'failed' => 0, 'errors' => [], 'ranAt' => '2026-01-01T00:00:00+00:00']);
});

test('getSettingsExtras degrades to null mapping metadata when Jira is unreachable', function () {
    Http::fake(fn () => throw new \Illuminate\Http\Client\ConnectionException('down'));

    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'jira',
        'enabled' => true,
        'credentials' => ['instance_url' => 'https://example.atlassian.net', 'email' => 'a@b.com', 'api_token' => 'secret'],
    ]);

    $extras = $this->service->getSettingsExtras($this->project);

    expect($extras['hasCredentials'])->toBeTrue()
        ->and($extras['mappingMetadata'])->toBeNull();
});

test('getImportProgress returns null when nothing has ever run', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'jira',
        'enabled' => true,
    ]);

    expect($this->service->getImportProgress($this->project))->toBeNull();
});

test('getImportProgress reshapes the stored progress into camelCase', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'jira',
        'enabled' => true,
        'options' => ['import_progress' => ['run_id' => 'run-1', 'status' => 'running', 'imported' => 2, 'updated' => 0, 'skipped' => 0, 'failed' => 0]],
    ]);

    expect($this->service->getImportProgress($this->project))->toBe([
        'runId' => 'run-1',
        'status' => 'running',
        'imported' => 2,
        'updated' => 0,
        'skipped' => 0,
        'failed' => 0,
    ]);
});
