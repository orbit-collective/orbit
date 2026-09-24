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
        // this row in place rather than creating a duplicate link.
        $existingLink = $this->externalIssueLinkRepository->findFor($projectIntegration, (string) $event->pullRequestId);

        $attributes = [
            'issue_id' => $issue->id,
            'external_key' => "$projectIntegration->github_repository_owner/$projectIntegration->github_repository_name#$event->pullRequestNumber",
            'external_url' => $event->pullRequestUrl,
            'external_type' => 'github_pull_request',
            'last_synced_at' => now(),
        ];

        // A retried `opened` event (after a transient ack/comment failure)
        // must never undo a link that a later lifecycle event has already
        // advanced past `open` - neither its status/timestamp nor its
        // title/branches/draft, which could otherwise regress to this
        // older event's data even while status itself stays untouched.
        if (! $existingLink || $this->isApplicable($existingLink, $event)) {
            $attributes = [...$attributes, ...array_filter([
                'status' => 'open',
                'github_updated_at' => $event->pullRequestUpdatedAt,
            ], fn ($value) => $value !== null), ...$this->nonNullMetadata($event)];
        }

        $this->externalIssueLinkRepository->upsertFor($projectIntegration, (string) $event->pullRequestId, $attributes);

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

        if (! $this->isApplicable($link, $event)) {
            Log::info('Ignoring a stale or duplicate GitHub pull request lifecycle event', [
                'projectIntegrationId' => $projectIntegration->id,
                'pullRequestId' => $event->pullRequestId,
                'action' => $event->action,
            ]);

            return GithubRelayEventOutcome::Skipped;
        }

        // status/github_updated_at/merged_at are filtered to non-null
        // alongside the metadata fields: resolveStatus() returns null for
        // `synchronize` (status is deliberately left unchanged - see the
        // MVP spec's "synchronize" behavior), and a lifecycle event that
        // omits a timestamp must never blank out one already stored, or the
        // stale-event guard above would stop protecting this link.
        $this->externalIssueLinkRepository->touch($link, array_filter([
            'status' => $this->resolveStatus($event),
            'github_updated_at' => $event->pullRequestUpdatedAt,
            'merged_at' => $event->pullRequestMergedAt,
            ...$this->nonNullMetadata($event),
        ], fn ($value) => $value !== null) + ['last_synced_at' => now()]);

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

    /**
     * `synchronize` intentionally returns null (no status change - new
     * commits don't imply an open/closed/merged transition on their own);
     * `handleLifecycleEvent()` filters nulls before persisting, so this
     * simply omits `status` from that update entirely.
     */
    private function resolveStatus(GithubRelayEventDTO $event): ?string
    {
        return match ($event->action) {
            'closed' => $event->pullRequestMerged === true ? 'merged' : 'closed',
            'reopened' => 'open',
            default => null,
        };
    }

    /**
     * Whether an event's data should be written onto an existing link,
     * given what's already stored. Used both to gate a lifecycle update
     * (reopened/closed/synchronize) and to protect against a retried
     * `opened` event undoing something a lifecycle event already applied.
     *
     * - With a GitHub-provided timestamp on both sides, the event must be
     *   strictly newer than what's stored. Equal timestamps are treated as
     *   *not* applicable - deterministic: whichever event was applied first
     *   wins a tie rather than letting arrival order flip the result, and
     *   it also makes reprocessing the exact same event a safe no-op.
     * - With no timestamp on one or both sides to compare, a link that
     *   hasn't been advanced past its initial `open` state has nothing to
     *   protect, so the event is still let through; a link already
     *   `closed`/`merged` is left alone rather than guessed at.
     */
    private function isApplicable(ExternalIssueLink $link, GithubRelayEventDTO $event): bool
    {
        if ($event->pullRequestUpdatedAt !== null && $link->github_updated_at !== null) {
            return Carbon::parse($event->pullRequestUpdatedAt)->gt($link->github_updated_at);
        }

        return $link->status === null || $link->status === 'open';
    }
}
