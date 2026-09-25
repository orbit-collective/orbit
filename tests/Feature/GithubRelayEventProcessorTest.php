<?php

use App\DataTransferObjects\Github\GithubRelayEventDTO;
use App\Enums\AutomationTriggerType;
use App\Models\AutomationRule;
use App\Models\AutomationRuleExecution;
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

function makeRelayEvent(
    string $body,
    int $pullRequestId = 4580098240,
    int $pullRequestNumber = 283,
    string $eventId = 'evt_1',
    ?string $title = 'Fix login redirect',
    ?string $sourceBranch = 'fix/login-redirect',
    ?string $targetBranch = 'master',
    ?bool $draft = false,
    string $action = 'opened',
    ?string $state = 'open',
    ?bool $merged = false,
    ?string $mergedAt = null,
    ?string $updatedAt = '2026-09-24T00:00:00Z',
    int $repositoryId = 1274545725,
): GithubRelayEventDTO {
    return new GithubRelayEventDTO(
        id: $eventId,
        type: 'pull_request',
        action: $action,
        deliveryId: 'delivery_1',
        repositoryId: $repositoryId,
        pullRequestId: $pullRequestId,
        pullRequestNumber: $pullRequestNumber,
        pullRequestUrl: 'https://github.com/orbit-collective/orbit/pull/283',
        pullRequestBody: $body,
        pullRequestTitle: $title,
        pullRequestSourceBranch: $sourceBranch,
        pullRequestTargetBranch: $targetBranch,
        pullRequestDraft: $draft,
        pullRequestState: $state,
        pullRequestMerged: $merged,
        pullRequestMergedAt: $mergedAt,
        pullRequestUpdatedAt: $updatedAt,
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
    $this->projectIntegration->githubRepositories()->create([
        'repository_id' => 1274545725,
        'owner' => 'orbit-collective',
        'name' => 'orbit',
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
        action: 'edited',
        deliveryId: 'delivery_1',
        repositoryId: 1,
        pullRequestId: 1,
        pullRequestNumber: 1,
        pullRequestUrl: 'https://github.com/o/r/pull/1',
        pullRequestBody: '',
        pullRequestTitle: null,
        pullRequestSourceBranch: null,
        pullRequestTargetBranch: null,
        pullRequestDraft: null,
        pullRequestState: null,
        pullRequestMerged: null,
        pullRequestMergedAt: null,
        pullRequestUpdatedAt: null,
        createdAt: now()->toIso8601String(),
    );

    expect($this->processor->process($event, $this->projectIntegration))->toBe(GithubRelayEventOutcome::Skipped);
});

test('the happy path persists pull request title, branches, status and draft state', function () {
    fakeSuccessfulComment();
    $issue = Issue::factory()->create(['project_id' => $this->project->id]);

    $this->processor->process(makeRelayEvent("<!-- orbit-issue:{$issue->id} -->"), $this->projectIntegration);

    $this->assertDatabaseHas('external_issue_links', [
        'project_integration_id' => $this->projectIntegration->id,
        'issue_id' => $issue->id,
        'pull_request_title' => 'Fix login redirect',
        'source_branch' => 'fix/login-redirect',
        'target_branch' => 'master',
        'status' => 'open',
        'draft' => 0,
    ]);
});

test('reprocessing with null metadata does not erase previously stored metadata', function () {
    fakeSuccessfulComment();
    $issue = Issue::factory()->create(['project_id' => $this->project->id]);

    $this->processor->process(makeRelayEvent("<!-- orbit-issue:{$issue->id} -->"), $this->projectIntegration);
    $this->processor->process(
        makeRelayEvent("<!-- orbit-issue:{$issue->id} -->", title: null, sourceBranch: null, targetBranch: null, draft: null),
        $this->projectIntegration,
    );

    $this->assertDatabaseHas('external_issue_links', [
        'project_integration_id' => $this->projectIntegration->id,
        'issue_id' => $issue->id,
        'pull_request_title' => 'Fix login redirect',
        'source_branch' => 'fix/login-redirect',
        'target_branch' => 'master',
        'draft' => 0,
    ]);
});

test('a minimal legacy-shaped event without metadata still creates the core link', function () {
    fakeSuccessfulComment();
    $issue = Issue::factory()->create(['project_id' => $this->project->id]);

    $outcome = $this->processor->process(
        makeRelayEvent("<!-- orbit-issue:{$issue->id} -->", title: null, sourceBranch: null, targetBranch: null, draft: null),
        $this->projectIntegration,
    );

    expect($outcome)->toBe(GithubRelayEventOutcome::Linked);
    $this->assertDatabaseHas('external_issue_links', [
        'project_integration_id' => $this->projectIntegration->id,
        'issue_id' => $issue->id,
        'status' => 'open',
        'pull_request_title' => null,
    ]);
});

function linkPullRequest(ProjectIntegration $projectIntegration, Project $project): Issue
{
    $issue = Issue::factory()->create(['project_id' => $project->id]);

    ExternalIssueLink::query()->create([
        'issue_id' => $issue->id,
        'project_integration_id' => $projectIntegration->id,
        'external_id' => '4580098240',
        'external_key' => 'orbit-collective/orbit#283',
        'external_url' => 'https://github.com/orbit-collective/orbit/pull/283',
        'external_type' => 'github_pull_request',
        'pull_request_title' => 'Fix login redirect',
        'source_branch' => 'fix/login-redirect',
        'target_branch' => 'master',
        'status' => 'closed',
        'draft' => false,
        'github_updated_at' => '2026-09-20T00:00:00Z',
    ]);

    return $issue;
}

test('a reopened pull request updates a linked relation to open without a new comment', function () {
    Http::fake();
    linkPullRequest($this->projectIntegration, $this->project);

    $outcome = $this->processor->process(
        makeRelayEvent('', action: 'reopened', updatedAt: '2026-09-24T00:00:00Z'),
        $this->projectIntegration,
    );

    expect($outcome)->toBe(GithubRelayEventOutcome::Synced);
    $this->assertDatabaseHas('external_issue_links', [
        'project_integration_id' => $this->projectIntegration->id,
        'external_id' => '4580098240',
        'status' => 'open',
    ]);
    expect(ExternalIssueLink::query()->count())->toBe(1);
    Http::assertNotSent(fn ($request) => str_contains($request->url(), '/v1/github/comments'));
});

test('a closed unmerged pull request updates a linked relation to closed', function () {
    Http::fake();
    linkPullRequest($this->projectIntegration, $this->project);

    $outcome = $this->processor->process(
        makeRelayEvent('', action: 'closed', state: 'closed', merged: false, updatedAt: '2026-09-24T00:00:00Z'),
        $this->projectIntegration,
    );

    expect($outcome)->toBe(GithubRelayEventOutcome::Synced);
    $this->assertDatabaseHas('external_issue_links', [
        'project_integration_id' => $this->projectIntegration->id,
        'external_id' => '4580098240',
        'status' => 'closed',
    ]);
    Http::assertNotSent(fn ($request) => str_contains($request->url(), '/v1/github/comments'));
});

test('a merged pull request updates a linked relation to merged', function () {
    Http::fake();
    linkPullRequest($this->projectIntegration, $this->project);

    $outcome = $this->processor->process(
        makeRelayEvent('', action: 'closed', state: 'closed', merged: true, mergedAt: '2026-09-24T01:00:00Z', updatedAt: '2026-09-24T00:00:00Z'),
        $this->projectIntegration,
    );

    expect($outcome)->toBe(GithubRelayEventOutcome::Synced);
    $this->assertDatabaseHas('external_issue_links', [
        'project_integration_id' => $this->projectIntegration->id,
        'external_id' => '4580098240',
        'status' => 'merged',
    ]);
    $link = ExternalIssueLink::query()->where('external_id', '4580098240')->first();
    expect($link->merged_at)->not->toBeNull();
    Http::assertNotSent(fn ($request) => str_contains($request->url(), '/v1/github/comments'));
});

test('a synchronize event refreshes metadata without creating a new relation or comment', function () {
    Http::fake();
    linkPullRequest($this->projectIntegration, $this->project);

    $outcome = $this->processor->process(
        makeRelayEvent('', action: 'synchronize', title: 'Fix login redirect properly', updatedAt: '2026-09-24T00:00:00Z'),
        $this->projectIntegration,
    );

    expect($outcome)->toBe(GithubRelayEventOutcome::Synced);
    expect(ExternalIssueLink::query()->count())->toBe(1);
    $this->assertDatabaseHas('external_issue_links', [
        'project_integration_id' => $this->projectIntegration->id,
        'external_id' => '4580098240',
        'pull_request_title' => 'Fix login redirect properly',
        // linkPullRequest() starts the link at 'closed' - synchronize must
        // never touch status, only refresh metadata.
        'status' => 'closed',
    ]);
    Http::assertNotSent(fn ($request) => str_contains($request->url(), '/v1/github/comments'));
});

test('a synchronize event does not reopen a merged pull request', function () {
    Http::fake();
    linkPullRequest($this->projectIntegration, $this->project);
    ExternalIssueLink::query()
        ->where('project_integration_id', $this->projectIntegration->id)
        ->where('external_id', '4580098240')
        ->update(['status' => 'merged']);

    $outcome = $this->processor->process(
        makeRelayEvent('', action: 'synchronize', updatedAt: '2026-09-24T00:00:00Z'),
        $this->projectIntegration,
    );

    expect($outcome)->toBe(GithubRelayEventOutcome::Synced);
    $this->assertDatabaseHas('external_issue_links', [
        'project_integration_id' => $this->projectIntegration->id,
        'external_id' => '4580098240',
        'status' => 'merged',
    ]);
});

test('a retried opened event does not overwrite a newer merged status', function () {
    fakeSuccessfulComment();
    $issue = linkPullRequest($this->projectIntegration, $this->project);

    ExternalIssueLink::query()
        ->where('project_integration_id', $this->projectIntegration->id)
        ->where('external_id', '4580098240')
        ->update([
            'status' => 'merged',
            'github_updated_at' => '2026-09-24T15:05:00Z',
        ]);

    // The opened event's own timestamp reflects when the PR was originally
    // opened, well before the merge that already advanced the link.
    $outcome = $this->processor->process(
        makeRelayEvent(
            "<!-- orbit-issue:{$issue->id} -->",
            action: 'opened',
            updatedAt: '2026-09-24T15:00:00Z',
        ),
        $this->projectIntegration,
    );

    expect($outcome)->toBe(GithubRelayEventOutcome::Linked);
    $this->assertDatabaseHas('external_issue_links', [
        'project_integration_id' => $this->projectIntegration->id,
        'external_id' => '4580098240',
        'status' => 'merged',
    ]);
});

test('a stale retried opened event does not overwrite newer metadata', function () {
    fakeSuccessfulComment();
    $issue = linkPullRequest($this->projectIntegration, $this->project);

    // A synchronize event already refreshed the title/branches while the
    // PR stayed open, moving the link's timestamp ahead of the original
    // opened event's.
    $this->processor->process(
        makeRelayEvent('', action: 'synchronize', title: 'Fix login redirect properly', updatedAt: '2026-09-24T15:10:00Z'),
        $this->projectIntegration,
    );

    $outcome = $this->processor->process(
        makeRelayEvent(
            "<!-- orbit-issue:{$issue->id} -->",
            action: 'opened',
            title: 'Fix login redirect',
            updatedAt: '2026-09-24T15:00:00Z',
        ),
        $this->projectIntegration,
    );

    expect($outcome)->toBe(GithubRelayEventOutcome::Linked);
    $this->assertDatabaseHas('external_issue_links', [
        'project_integration_id' => $this->projectIntegration->id,
        'external_id' => '4580098240',
        'pull_request_title' => 'Fix login redirect properly',
    ]);
});

test('a retried opened event without a timestamp does not reopen a closed pull request', function () {
    fakeSuccessfulComment();
    $issue = linkPullRequest($this->projectIntegration, $this->project);

    ExternalIssueLink::query()
        ->where('project_integration_id', $this->projectIntegration->id)
        ->where('external_id', '4580098240')
        ->update(['status' => 'closed', 'github_updated_at' => '2026-09-24T15:05:00Z']);

    $outcome = $this->processor->process(
        makeRelayEvent("<!-- orbit-issue:{$issue->id} -->", action: 'opened', updatedAt: null),
        $this->projectIntegration,
    );

    expect($outcome)->toBe(GithubRelayEventOutcome::Linked);
    $this->assertDatabaseHas('external_issue_links', [
        'project_integration_id' => $this->projectIntegration->id,
        'external_id' => '4580098240',
        'status' => 'closed',
    ]);
});

test('equal timestamps do not let an out-of-order lifecycle event overwrite the applied one', function () {
    Http::fake();
    linkPullRequest($this->projectIntegration, $this->project);

    $this->processor->process(
        makeRelayEvent('', action: 'closed', state: 'closed', merged: true, mergedAt: '2026-09-24T15:00:00Z', updatedAt: '2026-09-24T15:00:00Z'),
        $this->projectIntegration,
    );

    // A reopened event sharing the exact same GitHub timestamp arrives
    // after the merge was already applied - there's no way to prove it's
    // older, but ties must not be allowed to flip an already-applied state.
    $outcome = $this->processor->process(
        makeRelayEvent('', action: 'reopened', updatedAt: '2026-09-24T15:00:00Z'),
        $this->projectIntegration,
    );

    expect($outcome)->toBe(GithubRelayEventOutcome::Skipped);
    $this->assertDatabaseHas('external_issue_links', [
        'project_integration_id' => $this->projectIntegration->id,
        'external_id' => '4580098240',
        'status' => 'merged',
    ]);
});

test('a timestamped reopened event still applies when the link has no stored timestamp', function () {
    Http::fake();
    linkPullRequest($this->projectIntegration, $this->project);

    // The closed event that set this link's status never carried a
    // timestamp, so the link has a status but no baseline to compare
    // against - a later, genuinely timestamped event must not be
    // permanently locked out by that missing baseline.
    ExternalIssueLink::query()
        ->where('project_integration_id', $this->projectIntegration->id)
        ->where('external_id', '4580098240')
        ->update(['status' => 'closed', 'github_updated_at' => null]);

    $outcome = $this->processor->process(
        makeRelayEvent('', action: 'reopened', updatedAt: '2026-09-24T15:00:00Z'),
        $this->projectIntegration,
    );

    expect($outcome)->toBe(GithubRelayEventOutcome::Synced);
    $this->assertDatabaseHas('external_issue_links', [
        'project_integration_id' => $this->projectIntegration->id,
        'external_id' => '4580098240',
        'status' => 'open',
    ]);
    $link = ExternalIssueLink::query()->where('external_id', '4580098240')->first();
    expect($link->github_updated_at)->not->toBeNull();
});

test('a lifecycle event with a missing timestamp does not erase previously stored timestamps', function () {
    Http::fake();
    linkPullRequest($this->projectIntegration, $this->project);
    ExternalIssueLink::query()
        ->where('project_integration_id', $this->projectIntegration->id)
        ->where('external_id', '4580098240')
        ->update([
            'status' => 'merged',
            'github_updated_at' => '2026-09-24T15:05:00Z',
            'merged_at' => '2026-09-24T15:05:00Z',
        ]);

    $outcome = $this->processor->process(
        makeRelayEvent('', action: 'synchronize', updatedAt: null, mergedAt: null),
        $this->projectIntegration,
    );

    // With no timestamp on the incoming event and the link already past
    // 'open', the event is skipped entirely rather than guessed at - so
    // nothing about the link, timestamps included, is touched.
    expect($outcome)->toBe(GithubRelayEventOutcome::Skipped);
    $link = ExternalIssueLink::query()->where('external_id', '4580098240')->first();
    expect($link->status)->toBe('merged')
        ->and($link->github_updated_at)->not->toBeNull()
        ->and($link->merged_at)->not->toBeNull();
});

test('a lifecycle event for an unlinked pull request is skipped without creating a relation', function () {
    Http::fake();

    $outcome = $this->processor->process(
        makeRelayEvent('', pullRequestId: 999999, action: 'closed', state: 'closed', merged: false),
        $this->projectIntegration,
    );

    expect($outcome)->toBe(GithubRelayEventOutcome::Skipped);
    expect(ExternalIssueLink::query()->count())->toBe(0);
    Http::assertNothingSent();
});

test('processing the same lifecycle event twice is idempotent', function () {
    Http::fake();
    linkPullRequest($this->projectIntegration, $this->project);

    $event = makeRelayEvent('', action: 'closed', state: 'closed', merged: true, mergedAt: '2026-09-24T01:00:00Z', updatedAt: '2026-09-24T00:00:00Z');

    $this->processor->process($event, $this->projectIntegration);
    $outcome = $this->processor->process($event, $this->projectIntegration);

    // The second pass carries the exact same GitHub timestamp as what's
    // now stored, so it's treated as a tied/duplicate delivery and skipped
    // - still a safe, ack-able outcome, and the resulting state is correct.
    expect($outcome)->toBe(GithubRelayEventOutcome::Skipped);
    expect(ExternalIssueLink::query()->count())->toBe(1);
    $this->assertDatabaseHas('external_issue_links', [
        'project_integration_id' => $this->projectIntegration->id,
        'external_id' => '4580098240',
        'status' => 'merged',
    ]);
});

test('a stale lifecycle event does not revert a newer merged status', function () {
    Http::fake();
    $issue = linkPullRequest($this->projectIntegration, $this->project);

    ExternalIssueLink::query()
        ->where('project_integration_id', $this->projectIntegration->id)
        ->where('external_id', '4580098240')
        ->update([
            'status' => 'merged',
            'github_updated_at' => '2026-09-24T15:05:00Z',
        ]);

    $outcome = $this->processor->process(
        makeRelayEvent('', action: 'synchronize', updatedAt: '2026-09-24T15:02:00Z'),
        $this->projectIntegration,
    );

    expect($outcome)->toBe(GithubRelayEventOutcome::Skipped);
    $this->assertDatabaseHas('external_issue_links', [
        'project_integration_id' => $this->projectIntegration->id,
        'external_id' => '4580098240',
        'status' => 'merged',
    ]);
    expect($issue)->not->toBeNull();
});

function makeGithubTriggerRule(Project $project, AutomationTriggerType $trigger): AutomationRule
{
    $rule = AutomationRule::query()->create([
        'project_id' => $project->id,
        'name' => 'Test rule',
        'trigger_type' => $trigger->value,
        'conditions' => [],
        'enabled' => true,
    ]);

    $rule->actions()->create([
        'type' => 'change_priority',
        'params' => ['priority' => 'high'],
        'sort_order' => 0,
    ]);

    return $rule;
}

test('a successful opened link fires the pull request opened trigger', function () {
    fakeSuccessfulComment();
    $issue = Issue::factory()->create(['project_id' => $this->project->id, 'priority' => 'low']);
    makeGithubTriggerRule($this->project, AutomationTriggerType::GithubPullRequestOpened);

    $this->processor->process(makeRelayEvent("<!-- orbit-issue:{$issue->id} -->"), $this->projectIntegration);

    expect($issue->fresh()->priority)->toBe('high');
});

test('a merged pull request fires the merged trigger, not the closed trigger', function () {
    Http::fake();
    $issue = linkPullRequest($this->projectIntegration, $this->project);
    $issue->update(['priority' => 'low']);
    makeGithubTriggerRule($this->project, AutomationTriggerType::GithubPullRequestMerged);
    makeGithubTriggerRule($this->project, AutomationTriggerType::GithubPullRequestClosed);

    $this->processor->process(
        makeRelayEvent('', action: 'closed', state: 'closed', merged: true, mergedAt: '2026-09-24T01:00:00Z', updatedAt: '2026-09-24T00:00:00Z'),
        $this->projectIntegration,
    );

    expect($issue->fresh()->priority)->toBe('high');
    expect(AutomationRuleExecution::query()->count())->toBe(1);
});

test('a closed unmerged pull request fires the closed trigger, not the merged trigger', function () {
    Http::fake();
    $issue = linkPullRequest($this->projectIntegration, $this->project);
    $issue->update(['priority' => 'low']);
    makeGithubTriggerRule($this->project, AutomationTriggerType::GithubPullRequestMerged);
    makeGithubTriggerRule($this->project, AutomationTriggerType::GithubPullRequestClosed);

    $this->processor->process(
        makeRelayEvent('', action: 'closed', state: 'closed', merged: false, updatedAt: '2026-09-24T00:00:00Z'),
        $this->projectIntegration,
    );

    expect($issue->fresh()->priority)->toBe('high');
    expect(AutomationRuleExecution::query()->count())->toBe(1);
});

test('a reopened pull request fires the reopened trigger', function () {
    Http::fake();
    $issue = linkPullRequest($this->projectIntegration, $this->project);
    $issue->update(['priority' => 'low']);
    makeGithubTriggerRule($this->project, AutomationTriggerType::GithubPullRequestReopened);

    $this->processor->process(
        makeRelayEvent('', action: 'reopened', updatedAt: '2026-09-24T00:00:00Z'),
        $this->projectIntegration,
    );

    expect($issue->fresh()->priority)->toBe('high');
});

test('a synchronize event fires the synchronized trigger', function () {
    Http::fake();
    $issue = linkPullRequest($this->projectIntegration, $this->project);
    $issue->update(['priority' => 'low']);
    makeGithubTriggerRule($this->project, AutomationTriggerType::GithubPullRequestSynchronized);

    $this->processor->process(
        makeRelayEvent('', action: 'synchronize', updatedAt: '2026-09-24T00:00:00Z'),
        $this->projectIntegration,
    );

    expect($issue->fresh()->priority)->toBe('high');
});

test('a skipped stale lifecycle event never fires a trigger', function () {
    Http::fake();
    $issue = linkPullRequest($this->projectIntegration, $this->project);
    $issue->update(['priority' => 'low']);
    ExternalIssueLink::query()
        ->where('project_integration_id', $this->projectIntegration->id)
        ->where('external_id', '4580098240')
        ->update(['status' => 'merged', 'github_updated_at' => '2026-09-24T15:05:00Z']);
    makeGithubTriggerRule($this->project, AutomationTriggerType::GithubPullRequestSynchronized);

    $this->processor->process(
        makeRelayEvent('', action: 'synchronize', updatedAt: '2026-09-24T15:02:00Z'),
        $this->projectIntegration,
    );

    expect($issue->fresh()->priority)->toBe('low');
    expect(AutomationRuleExecution::query()->count())->toBe(0);
});

test('an unlinked lifecycle event never fires a trigger', function () {
    Http::fake();
    makeGithubTriggerRule($this->project, AutomationTriggerType::GithubPullRequestClosed);

    $this->processor->process(
        makeRelayEvent('', pullRequestId: 999999, action: 'closed', state: 'closed', merged: false),
        $this->projectIntegration,
    );

    expect(AutomationRuleExecution::query()->count())->toBe(0);
});

test('duplicate relay event delivery does not fire the trigger twice', function () {
    Http::fake();
    $issue = linkPullRequest($this->projectIntegration, $this->project);
    $issue->update(['priority' => 'low']);
    makeGithubTriggerRule($this->project, AutomationTriggerType::GithubPullRequestReopened);

    $event = makeRelayEvent('', action: 'reopened', updatedAt: '2026-09-24T00:00:00Z');
    $this->processor->process($event, $this->projectIntegration);
    $issue->update(['priority' => 'low']);
    $this->processor->process($event, $this->projectIntegration);

    expect(AutomationRuleExecution::query()->count())->toBe(1);
});

test('a disabled automation rule does not execute even though the trigger fires', function () {
    Http::fake();
    $issue = linkPullRequest($this->projectIntegration, $this->project);
    $issue->update(['priority' => 'low']);
    $rule = makeGithubTriggerRule($this->project, AutomationTriggerType::GithubPullRequestReopened);
    $rule->update(['enabled' => false]);

    $this->processor->process(
        makeRelayEvent('', action: 'reopened', updatedAt: '2026-09-24T00:00:00Z'),
        $this->projectIntegration,
    );

    expect($issue->fresh()->priority)->toBe('low');
});

test('an opened event for a repository not connected to this project is skipped', function () {
    fakeSuccessfulComment();
    $issue = Issue::factory()->create(['project_id' => $this->project->id]);

    $outcome = $this->processor->process(
        makeRelayEvent("<!-- orbit-issue:{$issue->id} -->", repositoryId: 999999999),
        $this->projectIntegration,
    );

    expect($outcome)->toBe(GithubRelayEventOutcome::Skipped);
    expect(ExternalIssueLink::query()->count())->toBe(0);
});

test('an opened event resolves the external_key from the matching repository, not the integration scalar columns', function () {
    fakeSuccessfulComment();
    $issue = Issue::factory()->create(['project_id' => $this->project->id]);
    $this->projectIntegration->githubRepositories()->create([
        'repository_id' => 555,
        'owner' => 'orbit-collective',
        'name' => 'orbit-api',
    ]);

    $this->processor->process(
        makeRelayEvent("<!-- orbit-issue:{$issue->id} -->", pullRequestId: 7777, pullRequestNumber: 51, repositoryId: 555),
        $this->projectIntegration,
    );

    $this->assertDatabaseHas('external_issue_links', [
        'external_id' => '7777',
        'external_key' => 'orbit-collective/orbit-api#51',
    ]);
});

test('a lifecycle event for a repository removed since the link was created is skipped', function () {
    Http::fake();
    linkPullRequest($this->projectIntegration, $this->project);
    $this->projectIntegration->githubRepositories()->delete();

    $outcome = $this->processor->process(
        makeRelayEvent('', action: 'reopened', updatedAt: '2026-09-24T00:00:00Z'),
        $this->projectIntegration,
    );

    expect($outcome)->toBe(GithubRelayEventOutcome::Skipped);
    $this->assertDatabaseHas('external_issue_links', [
        'project_integration_id' => $this->projectIntegration->id,
        'external_id' => '4580098240',
        'status' => 'closed',
    ]);
});
