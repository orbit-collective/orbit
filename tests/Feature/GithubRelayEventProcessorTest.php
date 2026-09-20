<?php

use App\DataTransferObjects\Github\GithubRelayEventDTO;
use App\Models\ExternalIssueLink;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Services\Integrations\Github\GithubRelayEventOutcome;
use App\Services\Integrations\Github\GithubRelayEventProcessor;
use App\Services\Integrations\Github\OrbitRelayApiException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

function makeRelayEvent(string $body, int $pullRequestId = 4580098240, int $pullRequestNumber = 283, string $eventId = 'evt_1'): GithubRelayEventDTO
{
    return new GithubRelayEventDTO(
        id: $eventId,
        type: 'pull_request',
        action: 'opened',
        deliveryId: 'delivery_1',
        repositoryId: 1274545725,
        pullRequestId: $pullRequestId,
        pullRequestNumber: $pullRequestNumber,
        pullRequestUrl: 'https://github.com/orbit-collective/orbit/pull/283',
        pullRequestBody: $body,
        createdAt: now()->toIso8601String(),
    );
}

beforeEach(function () {
    $this->processor = app(GithubRelayEventProcessor::class);
    $this->project = Project::factory()->create();
    $this->projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
        'github_repository_owner' => 'orbit-collective',
        'github_repository_name' => 'orbit',
    ]);
});

function fakeSuccessfulComment(): void
{
    Http::fake(['*/v1/github/comments' => Http::response([
        'success' => true,
        'data' => ['duplicate' => false, 'comment' => ['id' => 1, 'url' => 'https://github.com/o/r/pull/283#comment-1']],
    ], 201)]);
}

test('the happy path links the pull request and requests a comment', function () {
    fakeSuccessfulComment();
    $issue = Issue::factory()->create(['project_id' => $this->project->id]);

    $outcome = $this->processor->process(makeRelayEvent("Body\n\n<!-- orbit-issue:{$issue->id} -->"), $this->projectIntegration);

    expect($outcome)->toBe(GithubRelayEventOutcome::Linked);
    $this->assertDatabaseHas('external_issue_links', [
        'project_integration_id' => $this->projectIntegration->id,
        'issue_id' => $issue->id,
        'external_id' => '4580098240',
        'external_type' => 'github_pull_request',
    ]);
    Http::assertSent(fn ($request) => str_contains($request->url(), '/v1/github/comments'));
});

test('no marker is skipped without creating a link or a comment', function () {
    $outcome = $this->processor->process(makeRelayEvent('No marker here.'), $this->projectIntegration);

    expect($outcome)->toBe(GithubRelayEventOutcome::Skipped);
    expect(ExternalIssueLink::query()->count())->toBe(0);
    Http::assertNotSent(fn ($request) => str_contains($request->url(), '/v1/github/comments'));
});

test('multiple markers are skipped and never link the first one', function () {
    $issue = Issue::factory()->create(['project_id' => $this->project->id]);

    $outcome = $this->processor->process(makeRelayEvent("<!-- orbit-issue:{$issue->id} --> <!-- orbit-issue:999 -->"), $this->projectIntegration);

    expect($outcome)->toBe(GithubRelayEventOutcome::Skipped);
    expect(ExternalIssueLink::query()->count())->toBe(0);
});

test('a missing issue is skipped', function () {
    $outcome = $this->processor->process(makeRelayEvent('<!-- orbit-issue:999999 -->'), $this->projectIntegration);

    expect($outcome)->toBe(GithubRelayEventOutcome::Skipped);
    expect(ExternalIssueLink::query()->count())->toBe(0);
});

test('an issue belonging to another project is skipped', function () {
    $otherProject = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $otherProject->id]);

    $outcome = $this->processor->process(makeRelayEvent("<!-- orbit-issue:{$issue->id} -->"), $this->projectIntegration);

    expect($outcome)->toBe(GithubRelayEventOutcome::Skipped);
    expect(ExternalIssueLink::query()->count())->toBe(0);
});

test('a comment failure throws, leaving the event unacked by the caller', function () {
    Http::fake(['*/v1/github/comments' => Http::response(['success' => false, 'error' => ['code' => 'INTERNAL_SERVER_ERROR', 'message' => 'boom']], 500)]);

    $issue = Issue::factory()->create(['project_id' => $this->project->id]);

    expect(fn () => $this->processor->process(makeRelayEvent("<!-- orbit-issue:{$issue->id} -->"), $this->projectIntegration))
        ->toThrow(OrbitRelayApiException::class);

    // The link is still persisted (it's idempotent) even though the
    // comment step failed - reprocessing this event will simply retry
    // the comment step without duplicating the link.
    expect(ExternalIssueLink::query()->count())->toBe(1);
});

test('reprocessing the same event is idempotent and does not duplicate the link', function () {
    fakeSuccessfulComment();
    $issue = Issue::factory()->create(['project_id' => $this->project->id]);
    $event = makeRelayEvent("<!-- orbit-issue:{$issue->id} -->");

    $this->processor->process($event, $this->projectIntegration);
    $outcome = $this->processor->process($event, $this->projectIntegration);

    expect($outcome)->toBe(GithubRelayEventOutcome::Linked);
    expect(ExternalIssueLink::query()->count())->toBe(1);
});

test('an unsupported event action is skipped', function () {
    $event = new GithubRelayEventDTO(
        id: 'evt_1',
        type: 'pull_request',
        action: 'closed',
        deliveryId: 'delivery_1',
        repositoryId: 1,
        pullRequestId: 1,
        pullRequestNumber: 1,
        pullRequestUrl: 'https://github.com/o/r/pull/1',
        pullRequestBody: '',
        createdAt: now()->toIso8601String(),
    );

    expect($this->processor->process($event, $this->projectIntegration))->toBe(GithubRelayEventOutcome::Skipped);
});
