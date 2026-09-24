<?php

namespace App\Services\Integrations\Github;

use App\DataTransferObjects\Github\GithubRelayEventDTO;
use App\Models\ExternalIssueLink;
use App\Models\ProjectIntegration;
use App\Repositories\ExternalIssueLinkRepository;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Processes exactly one relay event end to end. `opened` runs the original
 * MVP flow (parse the marker, resolve the issue, persist the PR<->issue
 * link, request the GitHub bot comment). `reopened`/`closed`/`synchronize`
 * (v0.9.3) update an *existing* link's lifecycle state by stable GitHub
 * identity (repository/connection + pull request id) - they never parse the
 * marker or create a new link, and never post a comment (see
 * handleLifecycleEvent()). Never acks the event itself — see
 * PollGithubRelayEvents, which only acks after this returns without
 * throwing (ack-last, see the MVP spec's "ACK order" section). A thrown
 * exception (network/API/DB failure) means the caller must leave the event
 * pending for the next poll tick; every other outcome (no marker, ambiguous,
 * issue not found/wrong project, unsupported event, unlinked lifecycle
 * event, stale lifecycle event) is a permanent, safely-ackable Skipped.
 */
class GithubRelayEventProcessor
{
    public function __construct(
        protected GithubMarkerParser $markerParser,
        protected GithubIssueResolver $issueResolver,
        protected ExternalIssueLinkRepository $externalIssueLinkRepository,
        protected GithubCommentFormatter $commentFormatter,
        protected OrbitRelayClient $relayClient,
    ) {}

    /**
     * @throws OrbitRelayApiException|Throwable on a transient failure
     */
    public function process(GithubRelayEventDTO $event, ProjectIntegration $projectIntegration): GithubRelayEventOutcome
    {
        if ($event->type !== 'pull_request') {
            return GithubRelayEventOutcome::Skipped;
        }

        return match ($event->action) {
            'opened' => $this->handleOpened($event, $projectIntegration),
            'reopened', 'closed', 'synchronize' => $this->handleLifecycleEvent($event, $projectIntegration),
            default => GithubRelayEventOutcome::Skipped,
        };
    }

    private function handleOpened(GithubRelayEventDTO $event, ProjectIntegration $projectIntegration): GithubRelayEventOutcome
    {
        $marker = $this->markerParser->parse($event->pullRequestBody);

        if ($marker->isAmbiguous()) {
            Log::warning('Ignoring a GitHub pull request with more than one orbit-issue marker', [
                'projectIntegrationId' => $projectIntegration->id,
                'pullRequestNumber' => $event->pullRequestNumber,
            ]);

            return GithubRelayEventOutcome::Skipped;
        }

        if ($marker->isNone()) {
            return GithubRelayEventOutcome::Skipped;
        }

        $issue = $this->issueResolver->resolve($marker->issueId, $projectIntegration->project_id);

        if (! $issue) {
            return GithubRelayEventOutcome::Skipped;
        }

        // Idempotent by (project_integration_id, external_id) - reprocessing
        // the same event (e.g. after a comment-request failure) updates
        // this row in place rather than creating a duplicate link. Metadata
        // fields are filtered to non-null so a legacy/minimal relay event
        // never wipes out metadata a previous, richer event already stored.
        $this->externalIssueLinkRepository->upsertFor($projectIntegration, (string) $event->pullRequestId, [
            'issue_id' => $issue->id,
            'external_key' => "$projectIntegration->github_repository_owner/$projectIntegration->github_repository_name#$event->pullRequestNumber",
            'external_url' => $event->pullRequestUrl,
            'external_type' => 'github_pull_request',
            'status' => 'open',
            'last_synced_at' => now(),
            ...$this->nonNullMetadata($event),
        ]);

        // orbit-api itself dedupes comment creation by eventId, so
        // reprocessing an already-commented event is a no-op there too.
        $this->relayClient->createComment(
            $projectIntegration->github_relay_token,
            $event->id,
            $event->pullRequestNumber,
            $this->commentFormatter->format($issue, $issue->project),
        );

        return GithubRelayEventOutcome::Linked;
    }

    /**
     * Updates an existing link's lifecycle state from `reopened`/`closed`/
     * `synchronize`. Deliberately never parses the marker or creates a new
     * link - the marker only performs the initial link on `opened`; once
     * linked, lookup is by stable GitHub identity (the connection's own
     * project_integration_id + the PR's numeric id), never by re-reading
     * the PR body, title, or number.
     */
    private function handleLifecycleEvent(GithubRelayEventDTO $event, ProjectIntegration $projectIntegration): GithubRelayEventOutcome
    {
        $link = $this->externalIssueLinkRepository->findFor($projectIntegration, (string) $event->pullRequestId);

        if (! $link) {
            return GithubRelayEventOutcome::Skipped;
        }

        if ($this->isStale($link, $event)) {
            Log::info('Ignoring a stale GitHub pull request lifecycle event', [
                'projectIntegrationId' => $projectIntegration->id,
                'pullRequestId' => $event->pullRequestId,
                'action' => $event->action,
            ]);

            return GithubRelayEventOutcome::Skipped;
        }

        $this->externalIssueLinkRepository->touch($link, [
            'status' => $this->resolveStatus($event),
            'last_synced_at' => now(),
            'github_updated_at' => $event->pullRequestUpdatedAt,
            'merged_at' => $event->pullRequestMergedAt,
            ...$this->nonNullMetadata($event),
        ]);

        return GithubRelayEventOutcome::Synced;
    }

    /**
     * @return array<string, string|bool>
     */
    private function nonNullMetadata(GithubRelayEventDTO $event): array
    {
        return array_filter([
            'pull_request_title' => $event->pullRequestTitle,
            'source_branch' => $event->pullRequestSourceBranch,
            'target_branch' => $event->pullRequestTargetBranch,
            'draft' => $event->pullRequestDraft,
        ], fn ($value) => $value !== null);
    }

    private function resolveStatus(GithubRelayEventDTO $event): string
    {
        if ($event->action === 'closed') {
            return $event->pullRequestMerged === true ? 'merged' : 'closed';
        }

        return 'open';
    }

    /**
     * A lifecycle event is stale when GitHub's own last-updated timestamp on
     * the incoming event is older than the one already stored on the link -
     * this protects against out-of-order delivery (e.g. a `synchronize`
     * arriving after the `closed`/merged event for the same PR) reverting a
     * newer state. With no timestamp on either side to compare, the update
     * is applied optimistically rather than permanently blocked.
     */
    private function isStale(ExternalIssueLink $link, GithubRelayEventDTO $event): bool
    {
        if ($event->pullRequestUpdatedAt === null || $link->github_updated_at === null) {
            return false;
        }

        return Carbon::parse($event->pullRequestUpdatedAt)->lt($link->github_updated_at);
    }
}
