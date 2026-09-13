<?php

use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Services\Integrations\Jira\JiraIntegrationImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->importer = app(JiraIntegrationImporter::class);
    $this->projectIntegration = ProjectIntegration::query()->create([
        'project_id' => Project::factory()->create()->id,
        'integration' => 'jira',
        'enabled' => true,
        'credentials' => ['instance_url' => 'https://example.atlassian.net', 'email' => 'a@b.com', 'api_token' => 'secret'],
    ]);
});

test('testConnection delegates to the API client', function () {
    Http::fake(['*/rest/api/3/myself' => Http::response([], 200)]);

    expect($this->importer->testConnection($this->projectIntegration))->toBeTrue();
});

test('fetchMappingMetadata maps statuses, priorities, and issue types into value/label options', function () {
    Http::fake([
        '*/rest/api/3/status' => Http::response([['id' => '1', 'name' => 'To Do'], ['id' => '2', 'name' => 'Done']], 200),
        '*/rest/api/3/priority' => Http::response([['id' => '10', 'name' => 'High']], 200),
        '*/rest/api/3/issuetype' => Http::response([['id' => '20', 'name' => 'Epic']], 200),
        '*/rest/api/3/label*' => Http::response(['values' => [], 'isLast' => true], 200),
    ]);

    $metadata = $this->importer->fetchMappingMetadata($this->projectIntegration);

    expect($metadata['statuses'])->toBe([
        ['value' => 'To Do', 'label' => 'To Do'],
        ['value' => 'Done', 'label' => 'Done'],
    ])->and($metadata['priorities'])->toBe([['value' => 'High', 'label' => 'High']])
        ->and($metadata['issueTypes'])->toBe([['value' => 'Epic', 'label' => 'Epic']]);
});

test('fetchMappingMetadata falls back to the id when an entry has no name', function () {
    Http::fake([
        '*/rest/api/3/status' => Http::response([['id' => '1']], 200),
        '*/rest/api/3/priority' => Http::response([], 200),
        '*/rest/api/3/issuetype' => Http::response([], 200),
        '*/rest/api/3/label*' => Http::response(['values' => [], 'isLast' => true], 200),
    ]);

    $metadata = $this->importer->fetchMappingMetadata($this->projectIntegration);

    expect($metadata['statuses'])->toBe([['value' => '1', 'label' => '1']]);
});

test('fetchMappingMetadata includes the remote label registry', function () {
    Http::fake([
        '*/rest/api/3/status' => Http::response([], 200),
        '*/rest/api/3/priority' => Http::response([], 200),
        '*/rest/api/3/issuetype' => Http::response([], 200),
        '*/rest/api/3/label*' => Http::response([
            'values' => ['regression', 'flaky'], 'isLast' => true,
        ], 200),
    ]);

    $metadata = app(JiraIntegrationImporter::class)->fetchMappingMetadata($this->projectIntegration);

    expect($metadata['labels'])->toBe([
        ['value' => 'regression', 'label' => 'regression'],
        ['value' => 'flaky', 'label' => 'flaky'],
    ]);
});

test('a paginated label registry is followed to the last page', function () {
    Http::fake([
        '*/rest/api/3/status' => Http::response([], 200),
        '*/rest/api/3/priority' => Http::response([], 200),
        '*/rest/api/3/issuetype' => Http::response([], 200),
        '*/rest/api/3/label*' => Http::sequence()
            ->push(['values' => ['one'], 'isLast' => false], 200)
            ->push(['values' => ['two'], 'isLast' => true], 200),
    ]);

    $metadata = app(JiraIntegrationImporter::class)->fetchMappingMetadata($this->projectIntegration);

    expect(collect($metadata['labels'])->pluck('value')->all())->toBe(['one', 'two']);
});
