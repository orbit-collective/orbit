<?php

use App\Models\ExternalIssueLink;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

function connectedGithubIntegration(Project $project, string $token = 'orb_local_secret'): ProjectIntegration
{
    return ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => $token,
        'github_status' => 'connected',
        'github_repository_owner' => 'orbit-collective',
        'github_repository_name' => 'orbit',
    ]);
}

test('a linked event is acked after processing succeeds', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    connectedGithubIntegration($project);

    Http::fake([
        '*/v1/github/events' => Http::response(['success' => true, 'data' => ['events' => [
            ['id' => 'evt_1', 'type' => 'pull_request', 'action' => 'opened', 'deliveryId' => 'd1', 'repository' => ['id' => 1], 'pullRequest' => ['id' => 10, 'number' => 283, 'url' => 'https://github.com/o/r/pull/283', 'body' => "<!-- orbit-issue:{$issue->id} -->"], 'createdAt' => 'now'],
        ]]], 200),
        '*/v1/github/comments' => Http::response(['success' => true, 'data' => ['duplicate' => false, 'comment' => ['id' => 1, 'url' => 'https://x']]], 201),
        '*/v1/github/events/evt_1/ack' => Http::response(['success' => true, 'data' => ['acknowledged' => true, 'eventId' => 'evt_1']], 200),
    ]);

    $this->artisan('github:poll-relay-events')->assertExitCode(0);

    Http::assertSent(fn ($request) => str_contains($request->url(), '/v1/github/events/evt_1/ack'));
    expect(ExternalIssueLink::query()->count())->toBe(1);
});

test('a transient comment failure leaves the event unacked', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    connectedGithubIntegration($project);

    Http::fake([
        '*/v1/github/events' => Http::response(['success' => true, 'data' => ['events' => [
            ['id' => 'evt_1', 'type' => 'pull_request', 'action' => 'opened', 'deliveryId' => 'd1', 'repository' => ['id' => 1], 'pullRequest' => ['id' => 10, 'number' => 283, 'url' => 'https://github.com/o/r/pull/283', 'body' => "<!-- orbit-issue:{$issue->id} -->"], 'createdAt' => 'now'],
        ]]], 200),
        '*/v1/github/comments' => Http::response(['success' => false, 'error' => ['code' => 'INTERNAL_SERVER_ERROR', 'message' => 'boom']], 500),
    ]);

    $this->artisan('github:poll-relay-events')->assertExitCode(0);

    Http::assertNotSent(fn ($request) => str_contains($request->url(), '/ack'));
});

test('a project whose events endpoint is unreachable does not stop the others', function () {
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $issueB = Issue::factory()->create(['project_id' => $projectB->id]);
    connectedGithubIntegration($projectA, 'orb_local_a');
    connectedGithubIntegration($projectB, 'orb_local_b');

    Http::fake([
        '*/v1/github/events' => function ($request) use ($issueB) {
            if ($request->hasHeader('Authorization', 'Bearer orb_local_a')) {
                return Http::response(['success' => false, 'error' => ['code' => 'INTERNAL_SERVER_ERROR', 'message' => 'boom']], 500);
            }

            return Http::response(['success' => true, 'data' => ['events' => [
                ['id' => 'evt_b', 'type' => 'pull_request', 'action' => 'opened', 'deliveryId' => 'd2', 'repository' => ['id' => 2], 'pullRequest' => ['id' => 20, 'number' => 5, 'url' => 'https://github.com/o/r/pull/5', 'body' => "<!-- orbit-issue:{$issueB->id} -->"], 'createdAt' => 'now'],
            ]]], 200);
        },
        '*/v1/github/comments' => Http::response(['success' => true, 'data' => ['duplicate' => false, 'comment' => ['id' => 1, 'url' => 'https://x']]], 201),
        '*/v1/github/events/evt_b/ack' => Http::response(['success' => true, 'data' => ['acknowledged' => true, 'eventId' => 'evt_b']], 200),
    ]);

    $this->artisan('github:poll-relay-events')->assertExitCode(0);

    Http::assertSent(fn ($request) => str_contains($request->url(), '/v1/github/events/evt_b/ack'));
    expect(ExternalIssueLink::query()->count())->toBe(1);
});
