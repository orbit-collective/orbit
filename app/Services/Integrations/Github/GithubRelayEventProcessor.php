<?php

namespace App\Services\Integrations\Github;

use App\DataTransferObjects\Github\GithubRelayEventDTO;
use App\Models\ProjectIntegration;
use App\Repositories\ExternalIssueLinkRepository;
use Illuminate\Support\Facades\Log;

/**
 * Processes exactly one relay event end to end: parse the marker, resolve
 * the issue, persist the PR<->issue link, and request the GitHub bot
 * comment. Never acks the event itself — see PollGithubRelayEvents, which
 * only acks after this returns without throwing (ack-last, see the MVP
 * spec's "ACK order" section). A thrown exception (network/API/DB failure)
 * means the caller must leave the event pending for the next poll tick;
 * every other outcome (no marker, ambiguous, issue not found/wrong
 * project, unsupported event) is a permanent, safely-ackable Skipped.
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
     * @throws OrbitRelayApiException|\Throwable on a transient failure
     */
    public function process(GithubRelayEventDTO $event, ProjectIntegration $projectIntegration): GithubRelayEventOutcome
    {
        if ($event->type !== 'pull_request' || $event->action !== 'opened') {
            return GithubRelayEventOutcome::Skipped;
        }

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
        $this->externalIssueLinkRepository->upsertFor($projectIntegration, (string) $event->pullRequestId, [
            'issue_id' => $issue->id,
            'external_key' => "{$projectIntegration->github_repository_owner}/{$projectIntegration->github_repository_name}#{$event->pullRequestNumber}",
            'external_url' => $event->pullRequestUrl,
            'external_type' => 'github_pull_request',
            'last_synced_at' => now(),
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
}
