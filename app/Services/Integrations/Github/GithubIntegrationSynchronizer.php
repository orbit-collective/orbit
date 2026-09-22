<?php

namespace App\Services\Integrations\Github;

use App\Models\ProjectIntegration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * The one place that actually syncs a GitHub integration: fetch pending
 * relay events, process and ack each one, and record the reliability
 * metadata (health.md's raw signals - see GithubIntegrationHealthService for
 * how they're turned into a health state). Used by both the scheduled
 * poller (PollGithubRelayEvents) and the manual "Retry sync" controller
 * action, so there is exactly one sync code path to reason about.
 *
 * Never acks an event before GithubRelayEventProcessor::process() has
 * returned successfully for it (ack-last, unchanged from the MVP). A stale
 * relay event - ack fails with EVENT_EXPIRED/EVENT_NOT_FOUND after local
 * processing already succeeded - is treated as complete, not a failure: the
 * link and comment request already happened, the relay's own pending record
 * just expired or vanished first.
 */
class GithubIntegrationSynchronizer
{
    private const int LOCK_SECONDS = 55;

    public function __construct(
        protected OrbitRelayClient $relayClient,
        protected GithubRelayEventProcessor $processor,
        protected GithubIntegrationErrorClassifier $errorClassifier,
    ) {}

    public function sync(ProjectIntegration $projectIntegration): GithubSyncResult
    {
        if ($projectIntegration->github_status !== 'connected') {
            return GithubSyncResult::skipped();
        }

        $lock = Cache::lock("github-sync:{$projectIntegration->id}", self::LOCK_SECONDS);

        if (! $lock->get()) {
            return GithubSyncResult::locked();
        }

        try {
            return $this->runCycle($projectIntegration);
        } finally {
            $lock->release();
        }
    }

    private function runCycle(ProjectIntegration $projectIntegration): GithubSyncResult
    {
        $projectIntegration->update(['github_last_sync_attempt_at' => now()]);

        $relayToken = $projectIntegration->resolveGithubRelayToken();

        if ($relayToken === null) {
            $error = new GithubSyncError(
                GithubIntegrationErrorClassifier::TOKEN_UNREADABLE_CODE,
                GithubIntegrationErrorClassifier::TOKEN_UNREADABLE_MESSAGE,
                isTransient: false,
            );

            Log::warning('Failed to sync a GitHub integration: local relay token is unreadable', [
                'projectIntegrationId' => $projectIntegration->id,
                'projectId' => $projectIntegration->project_id,
            ]);

            $this->recordFailure($projectIntegration, $error);

            return GithubSyncResult::failure($error);
        }

        try {
            $events = $this->relayClient->listEvents($relayToken);
        } catch (Throwable $exception) {
            $error = $this->errorClassifier->classify($exception);

            Log::warning('Failed to fetch GitHub relay events for a project', [
                'projectIntegrationId' => $projectIntegration->id,
                'projectId' => $projectIntegration->project_id,
                'errorCode' => $error->code,
            ]);

            $this->recordFailure($projectIntegration, $error);

            return GithubSyncResult::failure($error);
        }

        $lastError = null;

        foreach ($events as $event) {
            try {
                $this->processor->process($event, $projectIntegration);
            } catch (Throwable $exception) {
                $lastError = $this->errorClassifier->classify($exception);

                Log::warning('Failed to process a GitHub relay event, leaving it pending', [
                    'projectIntegrationId' => $projectIntegration->id,
                    'projectId' => $projectIntegration->project_id,
                    'eventId' => $event->id,
                    'deliveryId' => $event->deliveryId,
                    'errorCode' => $lastError->code,
                ]);

                continue;
            }

            try {
                $this->relayClient->ackEvent($relayToken, $event->id);
            } catch (OrbitRelayApiException $exception) {
                if (in_array($exception->errorCode, ['EVENT_EXPIRED', 'EVENT_NOT_FOUND'], true)) {
                    continue;
                }

                $lastError = $this->errorClassifier->classify($exception);

                Log::warning('Failed to acknowledge a GitHub relay event', [
                    'projectIntegrationId' => $projectIntegration->id,
                    'projectId' => $projectIntegration->project_id,
                    'eventId' => $event->id,
                    'deliveryId' => $event->deliveryId,
                    'errorCode' => $lastError->code,
                ]);
            } catch (Throwable $exception) {
                $lastError = $this->errorClassifier->classify($exception);

                Log::warning('Failed to acknowledge a GitHub relay event', [
                    'projectIntegrationId' => $projectIntegration->id,
                    'projectId' => $projectIntegration->project_id,
                    'eventId' => $event->id,
                    'deliveryId' => $event->deliveryId,
                    'errorCode' => $lastError->code,
                ]);
            }
        }

        $projectIntegration->update(['github_pending_event_count' => count($events)]);

        if ($lastError === null) {
            $this->recordSuccess($projectIntegration);

            return GithubSyncResult::success();
        }

        $this->recordFailure($projectIntegration, $lastError);

        return GithubSyncResult::failure($lastError);
    }

    private function recordFailure(ProjectIntegration $projectIntegration, GithubSyncError $error): void
    {
        $attributes = [
            'github_last_failed_sync_at' => now(),
            'github_consecutive_failures' => $projectIntegration->github_consecutive_failures + 1,
            'github_last_error_code' => $error->code,
            'github_last_error_message' => $error->safeMessage,
        ];

        // A revoked connection is detected here, not just reported: the
        // scheduler's connected-only query then naturally stops polling it.
        if ($error->code === 'CONNECTION_REVOKED') {
            $attributes['github_status'] = 'revoked';
            $attributes['github_revoked_at'] = now();
        }

        $projectIntegration->update($attributes);
    }

    private function recordSuccess(ProjectIntegration $projectIntegration): void
    {
        $projectIntegration->update([
            'github_last_synced_at' => now(),
            'github_consecutive_failures' => 0,
            'github_last_error_code' => null,
            'github_last_error_message' => null,
        ]);
    }
}
