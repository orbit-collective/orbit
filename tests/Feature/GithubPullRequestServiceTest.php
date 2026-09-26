<?php

use App\DataTransferObjects\Github\GithubCreatedPullRequestDTO;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Services\Integrations\Github\GithubPullRequestService;
use App\Services\Integrations\Github\OrbitRelayApiException;
use App\Services\Integrations\Github\OrbitRelayClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->project = Project::factory()->create();
    $this->issue = Issue::factory()->create(['project_id' => $this->project->id]);
});

test('create always appends the orbit-issue marker to the body', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    $relayClient = Mockery::mock(OrbitRelayClient::class);
    $relayClient->shouldReceive('createPullRequest')
        ->once()
        ->with('orb_local_secret', 1, 'Fix login', 'fix/login', 'main', "Fixes the redirect loop.\n\n<!-- orbit-issue:{$this->issue->id} -->")
        ->andReturn(new GithubCreatedPullRequestDTO(51, 'https://github.com/orbit-collective/orbit/pull/51', 'Fix login'));
    $this->app->instance(OrbitRelayClient::class, $relayClient);

    $pullRequest = app(GithubPullRequestService::class)->create(
        $this->project,
        $this->issue,
        1,
        'Fix login',
        'fix/login',
        'main',
        'Fixes the redirect loop.',
    );

    expect($pullRequest->number)->toBe(51);
});

test('create appends the marker even when no body is given', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    $relayClient = Mockery::mock(OrbitRelayClient::class);
    $relayClient->shouldReceive('createPullRequest')
        ->once()
        ->with('orb_local_secret', 1, 'Fix login', 'fix/login', 'main', "\n\n<!-- orbit-issue:{$this->issue->id} -->")
        ->andReturn(new GithubCreatedPullRequestDTO(51, 'https://github.com/orbit-collective/orbit/pull/51', 'Fix login'));
    $this->app->instance(OrbitRelayClient::class, $relayClient);

    app(GithubPullRequestService::class)->create($this->project, $this->issue, 1, 'Fix login', 'fix/login', 'main');
});

test('create throws a validation exception when nothing is connected', function () {
    expect(fn () => app(GithubPullRequestService::class)->create($this->project, $this->issue, 1, 'x', 'a', 'b'))
        ->toThrow(ValidationException::class);
});

test('create translates a relay error into a clean validation message', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    $relayClient = Mockery::mock(OrbitRelayClient::class);
    $relayClient->shouldReceive('createPullRequest')
        ->andThrow(new OrbitRelayApiException('failed', 'GITHUB_REPOSITORY_NOT_ALLOWED'));
    $this->app->instance(OrbitRelayClient::class, $relayClient);

    try {
        app(GithubPullRequestService::class)->create($this->project, $this->issue, 999, 'x', 'a', 'b');
        $this->fail('Expected a ValidationException.');
    } catch (ValidationException $exception) {
        expect($exception->errors()['pullRequest'][0])->toBe('That repository is not connected to this project.');
    }
});

test('create surfaces orbit-api\'s own message for an unmapped GITHUB_PULL_REQUEST_REJECTED error', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    $relayClient = Mockery::mock(OrbitRelayClient::class);
    $relayClient->shouldReceive('createPullRequest')
        ->andThrow(new OrbitRelayApiException('A pull request already exists for orbit-collective:fix/login.', 'GITHUB_PULL_REQUEST_REJECTED'));
    $this->app->instance(OrbitRelayClient::class, $relayClient);

    try {
        app(GithubPullRequestService::class)->create($this->project, $this->issue, 1, 'x', 'fix/login', 'main');
        $this->fail('Expected a ValidationException.');
    } catch (ValidationException $exception) {
        expect($exception->errors()['pullRequest'][0])->toBe('A pull request already exists for orbit-collective:fix/login.');
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
    $relayClient->shouldReceive('createPullRequest')
        ->andThrow(new OrbitRelayApiException('GitHub API request failed.', 'GITHUB_API_ERROR'));
    $this->app->instance(OrbitRelayClient::class, $relayClient);

    try {
        app(GithubPullRequestService::class)->create($this->project, $this->issue, 1, 'x', 'a', 'b');
        $this->fail('Expected a ValidationException.');
    } catch (ValidationException $exception) {
        expect($exception->errors()['pullRequest'][0])->toBe('Failed to create the pull request.');
    }
});
