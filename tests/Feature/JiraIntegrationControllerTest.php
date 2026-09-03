<?php

use App\Jobs\ImportJiraIssuesJob;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->project = Project::factory()->create();
    $this->admin = User::factory()->create();
    $this->project->users()->attach($this->admin->id, ['role' => 'admin']);
});

test('an admin can connect Jira with valid credentials', function () {
    Http::fake(['*/rest/api/3/myself' => Http::response(['accountId' => 'abc'], 200)]);

    $response = $this->actingAs($this->admin)->post("/projects/{$this->project->id}/integrations/jira/connect", [
        'instance_url' => 'https://example.atlassian.net',
        'email' => 'a@b.com',
        'api_token' => 'secret',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('project_integrations', [
        'project_id' => $this->project->id,
        'integration' => 'jira',
    ]);
});

test('connecting Jira with bad credentials fails validation', function () {
    Http::fake(['*/rest/api/3/myself' => Http::response(['message' => 'Unauthorized'], 401)]);

    $response = $this->actingAs($this->admin)->post("/projects/{$this->project->id}/integrations/jira/connect", [
        'instance_url' => 'https://example.atlassian.net',
        'email' => 'a@b.com',
        'api_token' => 'wrong',
    ]);

    $response->assertSessionHasErrors('instance_url');
});

test('connect requires all credential fields', function () {
    $response = $this->actingAs($this->admin)->post("/projects/{$this->project->id}/integrations/jira/connect", []);

    $response->assertSessionHasErrors(['instance_url', 'email', 'api_token']);
});

test('a member without the integrations.update permission cannot connect Jira', function () {
    $member = User::factory()->create();
    $this->project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($member)->post("/projects/{$this->project->id}/integrations/jira/connect", [
        'instance_url' => 'https://example.atlassian.net',
        'email' => 'a@b.com',
        'api_token' => 'secret',
    ]);

    $response->assertForbidden();
});

test('guests cannot connect Jira', function () {
    $response = $this->post("/projects/{$this->project->id}/integrations/jira/connect", [
        'instance_url' => 'https://example.atlassian.net',
        'email' => 'a@b.com',
        'api_token' => 'secret',
    ]);

    $response->assertRedirect(route('login'));
});

test('updating mappings requires Jira to already be connected', function () {
    $response = $this->actingAs($this->admin)->put("/projects/{$this->project->id}/integrations/jira/mappings", [
        'mappings' => [['mapping_type' => 'status', 'external_value' => 'To Do', 'orbit_value' => 'open']],
    ]);

    $response->assertNotFound();
});

test('an admin can update mappings once Jira is connected', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'jira',
        'enabled' => true,
        'credentials' => ['instance_url' => 'https://example.atlassian.net', 'email' => 'a@b.com', 'api_token' => 'secret'],
    ]);

    $response = $this->actingAs($this->admin)->put("/projects/{$this->project->id}/integrations/jira/mappings", [
        'mappings' => [
            ['mapping_type' => 'status', 'external_value' => 'To Do', 'orbit_value' => 'open', 'external_label' => 'To Do'],
        ],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('integration_field_mappings', [
        'external_value' => 'To Do',
        'orbit_value' => 'open',
    ]);
});

test('updateMappings rejects an invalid mapping_type', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'jira',
        'enabled' => true,
        'credentials' => ['instance_url' => 'https://example.atlassian.net', 'email' => 'a@b.com', 'api_token' => 'secret'],
    ]);

    $response = $this->actingAs($this->admin)->put("/projects/{$this->project->id}/integrations/jira/mappings", [
        'mappings' => [
            ['mapping_type' => 'not-a-real-type', 'external_value' => 'To Do', 'orbit_value' => 'open'],
        ],
    ]);

    $response->assertSessionHasErrors('mappings.0.mapping_type');
});

test('triggering an import requires Jira to already be connected', function () {
    $response = $this->actingAs($this->admin)->post("/projects/{$this->project->id}/integrations/jira/import", [
        'project_key' => 'FE',
    ]);

    $response->assertNotFound();
});

test('an admin can trigger an import once Jira is connected', function () {
    Bus::fake();

    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'jira',
        'enabled' => true,
        'credentials' => ['instance_url' => 'https://example.atlassian.net', 'email' => 'a@b.com', 'api_token' => 'secret'],
    ]);

    $response = $this->actingAs($this->admin)->post("/projects/{$this->project->id}/integrations/jira/import", [
        'project_key' => 'FE',
        'sync_existing' => true,
    ]);

    $response->assertRedirect();
    Bus::assertDispatched(ImportJiraIssuesJob::class, function ($job) {
        return $job->importOptions === ['project_key' => 'FE', 'sync_existing' => true];
    });
});

test('a member without the integrations.update permission cannot trigger an import', function () {
    $member = User::factory()->create();
    $this->project->users()->attach($member->id, ['role' => 'member']);
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'jira',
        'enabled' => true,
        'credentials' => ['instance_url' => 'https://example.atlassian.net', 'email' => 'a@b.com', 'api_token' => 'secret'],
    ]);

    $response = $this->actingAs($member)->post("/projects/{$this->project->id}/integrations/jira/import", [
        'project_key' => 'FE',
    ]);

    $response->assertForbidden();
});
