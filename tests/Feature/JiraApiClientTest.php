<?php

use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Services\Integrations\Jira\JiraApiClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->client = app(JiraApiClient::class);
    $this->projectIntegration = ProjectIntegration::query()->create([
        'project_id' => Project::factory()->create()->id,
        'integration' => 'jira',
        'enabled' => true,
        'credentials' => ['instance_url' => 'https://example.atlassian.net/', 'email' => 'a@b.com', 'api_token' => 'secret'],
    ]);
});

test('testConnection returns true on a successful response', function () {
    Http::fake(['*/rest/api/3/myself' => Http::response(['accountId' => 'abc'], 200)]);

    expect($this->client->testConnection($this->projectIntegration))->toBeTrue();

    Http::assertSent(function ($request) {
        return str_starts_with($request->url(), 'https://example.atlassian.net/rest/api/3/myself')
            && $request->hasHeader('Authorization');
    });
});

test('testConnection returns false on an unauthorized response', function () {
    Http::fake(['*/rest/api/3/myself' => Http::response(['message' => 'Unauthorized'], 401)]);

    expect($this->client->testConnection($this->projectIntegration))->toBeFalse();
});

test('testConnection returns false when the connection itself fails', function () {
    Http::fake(function () {
        throw new ConnectionException('Could not connect');
    });

    expect($this->client->testConnection($this->projectIntegration))->toBeFalse();
});

test('getStatuses, getPriorities, and getIssueTypes return the raw decoded JSON', function () {
    Http::fake([
        '*/rest/api/3/status' => Http::response([['id' => '1', 'name' => 'To Do']], 200),
        '*/rest/api/3/priority' => Http::response([['id' => '2', 'name' => 'High']], 200),
        '*/rest/api/3/issuetype' => Http::response([['id' => '3', 'name' => 'Task']], 200),
    ]);

    expect($this->client->getStatuses($this->projectIntegration))->toBe([['id' => '1', 'name' => 'To Do']])
        ->and($this->client->getPriorities($this->projectIntegration))->toBe([['id' => '2', 'name' => 'High']])
        ->and($this->client->getIssueTypes($this->projectIntegration))->toBe([['id' => '3', 'name' => 'Task']]);
});

test('searchIssues includes the jql/maxResults/fields query and omits nextPageToken on the first page', function () {
    Http::fake(['*/rest/api/3/search/jql*' => Http::response(['issues' => []], 200)]);

    $this->client->searchIssues($this->projectIntegration, 'project = "FE"', null, 50);

    Http::assertSent(function ($request) {
        return $request->data()['jql'] === 'project = "FE"'
            && $request->data()['maxResults'] === 50
            && str_contains($request->data()['fields'], 'summary')
            && ! array_key_exists('nextPageToken', $request->data());
    });
});

test('searchIssues includes nextPageToken on subsequent pages', function () {
    Http::fake(['*/rest/api/3/search/jql*' => Http::response(['issues' => []], 200)]);

    $this->client->searchIssues($this->projectIntegration, 'project = "FE"', 'token-123', 50);

    Http::assertSent(fn ($request) => str_contains($request->url(), 'nextPageToken=token-123'));
});

test('a connection failure while fetching JSON throws a RuntimeException without logging credentials', function () {
    Http::fake(function () {
        throw new ConnectionException('DNS failure');
    });

    expect(fn () => $this->client->getStatuses($this->projectIntegration))
        ->toThrow(RuntimeException::class);
});

test('a non-2xx response while fetching JSON throws a RequestException', function () {
    Http::fake(['*/rest/api/3/status' => Http::response(['message' => 'Server error'], 500)]);

    expect(fn () => $this->client->getStatuses($this->projectIntegration))
        ->toThrow(RequestException::class);
});
