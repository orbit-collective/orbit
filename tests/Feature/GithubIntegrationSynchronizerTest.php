<?php

use App\Models\ExternalIssueLink;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Services\Integrations\Github\GithubIntegrationSynchronizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

function makeConnectedGithubIntegration(Project $project, array $overrides = []): ProjectIntegration
{
    return ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
        'github_repository_owner' => 'orbit-collective',
        'github_repository_name' => 'orbit',
        ...$overrides,
    ]);
}

beforeEach(function () {
    $this->synchronizer = app(GithubIntegrationSynchronizer::class);
});

test('a fully successful cycle records the success metadata and resets the failure count', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $pi = makeConnectedGithubIntegration($project, ['github_consecutive_failures' => 2, 'github_last_error_code' => 'INTERNAL_SERVER_ERROR']);

    Http::fake([
        '*/v1/github/events' => Http::response(['success' => true, 'data' => ['events' => [
            ['id' => 'evt_1', 'type' => 'pull_request', 'action' => 'opened', 'deliveryId' => 'd1', 'repository' => ['id' => 1], 'pullRequest' => ['id' => 10, 'number' => 283, 'url' => 'https://github.com/o/r/pull/283', 'body' => "<!-- orbit-issue:{$issue->id} -->"], 'createdAt' => 'now'],
        ]]], 200),
        '*/v1/github/comments' => Http::response(['success' => true, 'data' => ['duplicate' => false, 'comment' => ['id' => 1, 'url' => 'https://x']]], 201),
        '*/v1/github/events/evt_1/ack' => Http::response(['success' => true, 'data' => ['acknowledged' => true, 'eventId' => 'evt_1']], 200),
    ]);

    $result = $this->synchronizer->sync($pi);

    expect($result->succeeded)->toBeTrue();

    $pi->refresh();
    expect($pi->github_consecutive_failures)->toBe(0)
        ->and($pi->github_last_error_code)->toBeNull()
        ->and($pi->github_last_synced_at)->not->toBeNull()
        ->and($pi->github_last_sync_attempt_at)->not->toBeNull()
        // The one fetched event was fully acked this cycle, so nothing is
        // actually still pending at orbit-api anymore.
        ->and($pi->github_pending_event_count)->toBe(0);
});

test('a transient fetch failure records a failure and does not ack anything', function () {
    $project = Project::factory()->create();
    $pi = makeConnectedGithubIntegration($project);

    Http::fake(['*/v1/github/events' => Http::response(['success' => false, 'error' => ['code' => 'INTERNAL_SERVER_ERROR', 'message' => 'boom']], 500)]);

    $result = $this->synchronizer->sync($pi);

    expect($result->succeeded)->toBeFalse()
        ->and($result->error->isTransient)->toBeTrue();

    $pi->refresh();
    expect($pi->github_consecutive_failures)->toBe(1)
        ->and($pi->github_last_error_code)->toBe('INTERNAL_SERVER_ERROR')
        ->and($pi->github_last_failed_sync_at)->not->toBeNull()
        ->and($pi->github_last_synced_at)->toBeNull();

    Http::assertNotSent(fn ($request) => str_contains($request->url(), '/ack'));
});

test('CONNECTION_REVOKED marks the integration revoked locally', function () {
    $project = Project::factory()->create();
    $pi = makeConnectedGithubIntegration($project);

    Http::fake(['*/v1/github/events' => Http::response(['success' => false, 'error' => ['code' => 'CONNECTION_REVOKED', 'message' => 'revoked']], 401)]);

    $this->synchronizer->sync($pi);

    $pi->refresh();
    expect($pi->github_status)->toBe('revoked')
        ->and($pi->github_revoked_at)->not->toBeNull();
});

test('a stale ack (EVENT_EXPIRED) after successful processing still counts as a success', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $pi = makeConnectedGithubIntegration($project);

    Http::fake([
        '*/v1/github/events' => Http::response(['success' => true, 'data' => ['events' => [
            ['id' => 'evt_1', 'type' => 'pull_request', 'action' => 'opened', 'deliveryId' => 'd1', 'repository' => ['id' => 1], 'pullRequest' => ['id' => 10, 'number' => 283, 'url' => 'https://github.com/o/r/pull/283', 'body' => "<!-- orbit-issue:{$issue->id} -->"], 'createdAt' => 'now'],
        ]]], 200),
        '*/v1/github/comments' => Http::response(['success' => true, 'data' => ['duplicate' => false, 'comment' => ['id' => 1, 'url' => 'https://x']]], 201),
        '*/v1/github/events/evt_1/ack' => Http::response(['success' => false, 'error' => ['code' => 'EVENT_EXPIRED', 'message' => 'expired']], 410),
    ]);

    $result = $this->synchronizer->sync($pi);

    expect($result->succeeded)->toBeTrue();

    $pi->refresh();
    expect($pi->github_consecutive_failures)->toBe(0)
        ->and(ExternalIssueLink::query()->count())->toBe(1);
});

test('a genuine ack failure (not expiry) is recorded as a failure', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $pi = makeConnectedGithubIntegration($project);

    Http::fake([
        '*/v1/github/events' => Http::response(['success' => true, 'data' => ['events' => [
            ['id' => 'evt_1', 'type' => 'pull_request', 'action' => 'opened', 'deliveryId' => 'd1', 'repository' => ['id' => 1], 'pullRequest' => ['id' => 10, 'number' => 283, 'url' => 'https://github.com/o/r/pull/283', 'body' => "<!-- orbit-issue:{$issue->id} -->"], 'createdAt' => 'now'],
        ]]], 200),
        '*/v1/github/comments' => Http::response(['success' => true, 'data' => ['duplicate' => false, 'comment' => ['id' => 1, 'url' => 'https://x']]], 201),
        '*/v1/github/events/evt_1/ack' => Http::response(['success' => false, 'error' => ['code' => 'INTERNAL_SERVER_ERROR', 'message' => 'boom']], 500),
    ]);

    $result = $this->synchronizer->sync($pi);

    expect($result->succeeded)->toBeFalse();

    $pi->refresh();
    expect($pi->github_consecutive_failures)->toBe(1);
});

test('a locked integration is skipped without touching its metadata', function () {
    $project = Project::factory()->create();
    $pi = makeConnectedGithubIntegration($project, ['github_consecutive_failures' => 3]);

    $lock = Cache::lock("github-sync:{$pi->id}", 55);
    $lock->get();

    $result = $this->synchronizer->sync($pi);

    expect($result->locked)->toBeTrue();

    $pi->refresh();
    expect($pi->github_consecutive_failures)->toBe(3)
        ->and($pi->github_last_sync_attempt_at)->toBeNull();

    $lock->release();
});

test('a pending integration is skipped, not synced', function () {
    $project = Project::factory()->create();
    $pi = ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'pending',
    ]);

    $result = $this->synchronizer->sync($pi);

    expect($result->skipped)->toBeTrue();
    Http::assertNothingSent();
});

test('the failure count keeps incrementing across repeated failures', function () {
    $project = Project::factory()->create();
    $pi = makeConnectedGithubIntegration($project);

    Http::fake(['*/v1/github/events' => Http::response(['success' => false, 'error' => ['code' => 'INTERNAL_SERVER_ERROR', 'message' => 'boom']], 500)]);

    $this->synchronizer->sync($pi);
    $pi->refresh();
    $this->synchronizer->sync($pi);
    $pi->refresh();

    expect($pi->github_consecutive_failures)->toBe(2);
});

test('a permanent error on an earlier event is not masked by a later transient failure', function () {
    $project = Project::factory()->create();
    $issueA = Issue::factory()->create(['project_id' => $project->id]);
    $issueB = Issue::factory()->create(['project_id' => $project->id]);
    $pi = makeConnectedGithubIntegration($project);

    Http::fake([
        '*/v1/github/events' => Http::response(['success' => true, 'data' => ['events' => [
            ['id' => 'evt_a', 'type' => 'pull_request', 'action' => 'opened', 'deliveryId' => 'd1', 'repository' => ['id' => 1], 'pullRequest' => ['id' => 10, 'number' => 283, 'url' => 'https://github.com/o/r/pull/283', 'body' => "<!-- orbit-issue:{$issueA->id} -->"], 'createdAt' => 'now'],
            ['id' => 'evt_b', 'type' => 'pull_request', 'action' => 'opened', 'deliveryId' => 'd2', 'repository' => ['id' => 1], 'pullRequest' => ['id' => 11, 'number' => 284, 'url' => 'https://github.com/o/r/pull/284', 'body' => "<!-- orbit-issue:{$issueB->id} -->"], 'createdAt' => 'now'],
        ]]], 200),
        '*/v1/github/comments' => Http::response(['success' => false, 'error' => ['code' => 'CONNECTION_REVOKED', 'message' => 'revoked']], 401),
    ]);

    $result = $this->synchronizer->sync($pi);

    expect($result->succeeded)->toBeFalse()
        ->and($result->error->code)->toBe('CONNECTION_REVOKED');

    $pi->refresh();
    expect($pi->github_status)->toBe('revoked')
        ->and($pi->github_last_error_code)->toBe('CONNECTION_REVOKED');

    // Only the first event's comment request is ever attempted - the batch
    // stops as soon as a connection-level error is detected, rather than
    // letting the second (transient) failure overwrite the real cause.
    Http::assertSentCount(2);
});

test('the pending event count reflects only the events not yet resolved this cycle', function () {
    $project = Project::factory()->create();
    $issueA = Issue::factory()->create(['project_id' => $project->id]);
    $issueB = Issue::factory()->create(['project_id' => $project->id]);
    $pi = makeConnectedGithubIntegration($project);

    Http::fake([
        '*/v1/github/events' => Http::response(['success' => true, 'data' => ['events' => [
            ['id' => 'evt_a', 'type' => 'pull_request', 'action' => 'opened', 'deliveryId' => 'd1', 'repository' => ['id' => 1], 'pullRequest' => ['id' => 10, 'number' => 283, 'url' => 'https://github.com/o/r/pull/283', 'body' => "<!-- orbit-issue:{$issueA->id} -->"], 'createdAt' => 'now'],
            ['id' => 'evt_b', 'type' => 'pull_request', 'action' => 'opened', 'deliveryId' => 'd2', 'repository' => ['id' => 1], 'pullRequest' => ['id' => 11, 'number' => 284, 'url' => 'https://github.com/o/r/pull/284', 'body' => "<!-- orbit-issue:{$issueB->id} -->"], 'createdAt' => 'now'],
        ]]], 200),
        '*/v1/github/comments' => function ($request) {
            $body = json_decode((string) $request->body(), true);

            if ($body['eventId'] === 'evt_a') {
                return Http::response(['success' => true, 'data' => ['duplicate' => false, 'comment' => ['id' => 1, 'url' => 'https://x']]], 201);
            }

            return Http::response(['success' => false, 'error' => ['code' => 'INTERNAL_SERVER_ERROR', 'message' => 'boom']], 500);
        },
        '*/v1/github/events/evt_a/ack' => Http::response(['success' => true, 'data' => ['acknowledged' => true, 'eventId' => 'evt_a']], 200),
    ]);

    $result = $this->synchronizer->sync($pi);

    expect($result->succeeded)->toBeFalse();

    $pi->refresh();
    // evt_a was fully acked (no longer pending); evt_b's comment failed
    // transiently, so it's the only one still genuinely pending.
    expect($pi->github_pending_event_count)->toBe(1);
});

test('a corrupted relay token never throws and is recorded without any http request', function () {
    $project = Project::factory()->create();
    $pi = makeConnectedGithubIntegration($project);

    DB::table('project_integrations')->where('id', $pi->id)->update([
        'github_relay_token' => 'not-a-valid-encrypted-payload',
    ]);
    $pi->refresh();

    $result = $this->synchronizer->sync($pi);

    expect($result->succeeded)->toBeFalse()
        ->and($result->error->code)->toBe('LOCAL_TOKEN_UNREADABLE');

    $pi->refresh();
    expect($pi->github_last_error_code)->toBe('LOCAL_TOKEN_UNREADABLE')
        ->and($pi->github_consecutive_failures)->toBe(1);

    Http::assertNothingSent();
});
