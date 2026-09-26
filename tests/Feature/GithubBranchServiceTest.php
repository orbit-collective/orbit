<?php

use App\DataTransferObjects\Github\GithubCreatedBranchDTO;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Services\Integrations\Github\GithubBranchService;
use App\Services\Integrations\Github\OrbitRelayApiException;
use App\Services\Integrations\Github\OrbitRelayClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->project = Project::factory()->create();
    $this->issue = Issue::factory()->create(['project_id' => $this->project->id, 'title' => 'Fix login redirect']);
});

test('defaultBranchName derives a slugified, truncated name from the issue', function () {
    $service = app(GithubBranchService::class);

    expect($service->defaultBranchName($this->issue))->toBe("{$this->issue->id}-fix-login-redirect");
});

test('create delegates to the relay client once GitHub is connected', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    $relayClient = Mockery::mock(OrbitRelayClient::class);
    $relayClient->shouldReceive('createBranch')
        ->once()
        ->with('orb_local_secret', 1, '1234-fix-login', null)
        ->andReturn(new GithubCreatedBranchDTO('1234-fix-login', 'https://github.com/orbit-collective/orbit/tree/1234-fix-login'));
    $this->app->instance(OrbitRelayClient::class, $relayClient);

    $branch = app(GithubBranchService::class)->create($this->project, $this->issue, 1, '1234-fix-login');

    expect($branch->name)->toBe('1234-fix-login');
});

test('create throws a validation exception when nothing is connected', function () {
    expect(fn () => app(GithubBranchService::class)->create($this->project, $this->issue, 1, '1234-fix-login'))
        ->toThrow(ValidationException::class);
});

test('create translates a GITHUB_BRANCH_ALREADY_EXISTS relay error into a clean validation message', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    $relayClient = Mockery::mock(OrbitRelayClient::class);
    $relayClient->shouldReceive('createBranch')
        ->andThrow(new OrbitRelayApiException('failed', 'GITHUB_BRANCH_ALREADY_EXISTS'));
    $this->app->instance(OrbitRelayClient::class, $relayClient);

    try {
        app(GithubBranchService::class)->create($this->project, $this->issue, 1, '1234-fix-login');
        $this->fail('Expected a ValidationException.');
    } catch (ValidationException $exception) {
        expect($exception->errors()['branch'][0])->toBe('A branch with that name already exists.');
    }
});

test('create surfaces orbit-api\'s own message for an unmapped GITHUB_BRANCH_REJECTED error', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    $relayClient = Mockery::mock(OrbitRelayClient::class);
    $relayClient->shouldReceive('createBranch')
        ->andThrow(new OrbitRelayApiException('Resource not accessible by integration', 'GITHUB_BRANCH_REJECTED'));
    $this->app->instance(OrbitRelayClient::class, $relayClient);

    try {
        app(GithubBranchService::class)->create($this->project, $this->issue, 1, '1234-fix-login');
        $this->fail('Expected a ValidationException.');
    } catch (ValidationException $exception) {
        expect($exception->errors()['branch'][0])->toBe('Resource not accessible by integration');
    }
});

test('create falls back to a generic message for a raw GITHUB_API_ERROR', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    $relayClient = Mockery::mock(OrbitRelayClient::class);
    $relayClient->shouldReceive('createBranch')
        ->andThrow(new OrbitRelayApiException('GitHub API request failed.', 'GITHUB_API_ERROR'));
    $this->app->instance(OrbitRelayClient::class, $relayClient);

    try {
        app(GithubBranchService::class)->create($this->project, $this->issue, 1, '1234-fix-login');
        $this->fail('Expected a ValidationException.');
    } catch (ValidationException $exception) {
        expect($exception->errors()['branch'][0])->toBe('Failed to create the branch.');
    }
});
