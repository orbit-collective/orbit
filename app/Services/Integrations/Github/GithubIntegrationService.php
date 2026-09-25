<?php

namespace App\Services\Integrations\Github;

use App\Jobs\SyncGithubIntegrationJob;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Repositories\GithubRepositoryRepository;
use App\Repositories\ProjectIntegrationRepository;
use App\Services\ActivityLogService;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Backs GithubIntegrationController: start/track/tear down a project's
 * orbit-api relay connection. Kept separate from the generic
 * ProjectIntegrationService, which only understands the webhook_url/options
 * shape notify integrations use, and from GithubRelayEventProcessor, which
 * handles per-event PR-linking once a connection is already connected.
 */
class GithubIntegrationService
{
    private const string INTEGRATION_KEY = 'github';

    public function __construct(
        protected ProjectIntegrationRepository $projectIntegrationRepository,
        protected OrbitRelayClient $relayClient,
        protected GithubIntegrationHealthService $healthService,
        protected ActivityLogService $activityLogService,
        protected GithubRepositoryRepository $githubRepositoryRepository,
    ) {}

    /**
     * Starts (or restarts, if still pending) a GitHub App installation flow.
     * Always requests a fresh orbit-api connection rather than reusing a
     * stale pending one, since orbit-api only ever hands back the install
     * URL and relay token once, at creation time.
     */
    public function connect(Project $project): ProjectIntegration
    {
        $result = $this->relayClient->createConnection();

        $projectIntegration = $this->projectIntegrationRepository->updateOrCreate($project, self::INTEGRATION_KEY, [
            'github_connection_id' => $result['connection']->id,
            'github_relay_token' => $result['token'],
            'github_install_url' => $result['installUrl'],
            'github_status' => 'pending',
            'github_installation_id' => null,
            'github_repository_id' => null,
            'github_repository_owner' => null,
            'github_repository_name' => null,
            'github_connected_at' => null,
            'github_revoked_at' => null,
            // A reconnect starts clean - a previous (possibly broken)
            // connection's failure history has nothing to do with this one.
            'github_last_synced_at' => null,
            'github_last_sync_attempt_at' => null,
            'github_last_failed_sync_at' => null,
            'github_last_error_code' => null,
            'github_last_error_message' => null,
            'github_consecutive_failures' => 0,
            'github_pending_event_count' => null,
        ]);

        $this->activityLogService->log($project->id, 'Started connecting the "github" integration');

        return $projectIntegration;
    }

    public function disconnect(Project $project): void
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, self::INTEGRATION_KEY);

        if (! $projectIntegration || $projectIntegration->github_status === 'revoked') {
            return;
        }

        // A relay token that's missing or unreadable means there's nothing
        // to revoke remotely — still proceed to mark it revoked locally
        // below, exactly like a best-effort remote revoke that failed.
        $relayToken = $projectIntegration->resolveGithubRelayToken();

        if ($relayToken) {
            try {
                $this->relayClient->revoke($relayToken);
            } catch (OrbitRelayApiException) {
                // Revoking is best-effort against orbit-api: even if the relay
                // is unreachable, Orbit Local must still stop trusting this
                // connection locally (see MVP spec — disconnect never needs to
                // guarantee the remote side also tore down).
            }
        }

        $projectIntegration->update([
            'github_status' => 'revoked',
            'github_revoked_at' => now(),
        ]);

        $this->activityLogService->log($project->id, 'Disconnected the "github" integration');
    }

    /**
     * The live connect-status readout for the settings UI to poll after
     * starting an installation. Reads only the local DB row unless still
     * "pending", in which case it checks orbit-api once per call — cheap
     * enough for a ~2s poll, and stops mattering once connected/revoked.
     * Health and the other reliability fields are always read from the
     * local row too - never a fresh orbit-api call - to avoid hammering the
     * relay just because a settings page is open (see
     * GithubIntegrationSynchronizer for the only place that actually talks
     * to orbit-api on a schedule).
     *
     * @return array{status: string, installUrl: ?string, repository: ?array{owner: string, name: string}, repositories: array<int, array{id: int, owner: string, name: string}>, connectedAt: ?string, health: ?string, lastSuccessfulSyncAt: ?string, lastSyncAttemptAt: ?string, lastFailedSyncAt: ?string, errorMessage: ?string, pendingEventCount: ?int, pendingEventCountCapped: bool}
     */
    public function getConnectStatus(Project $project): array
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, self::INTEGRATION_KEY);

        if (! $projectIntegration || $projectIntegration->getRawOriginal('github_relay_token') === null) {
            return [
                'status' => 'not_connected', 'installUrl' => null, 'repository' => null, 'repositories' => [], 'connectedAt' => null,
                'health' => null, 'lastSuccessfulSyncAt' => null, 'lastSyncAttemptAt' => null, 'lastFailedSyncAt' => null,
                'errorMessage' => null, 'pendingEventCount' => null, 'pendingEventCountCapped' => false,
            ];
        }

        if ($projectIntegration->hasUnreadableGithubRelayToken()) {
            // A token is stored but can no longer be decrypted (e.g. the
            // app key changed since it was written) — surface this as an
            // ordinary "error" health state (same UI path as an invalid
            // relay token reported by orbit-api) instead of ever letting
            // the DecryptException reach the caller uncaught. Recorded once
            // so it's visible everywhere health is read, not just here.
            if ($projectIntegration->github_last_error_code !== GithubIntegrationErrorClassifier::TOKEN_UNREADABLE_CODE) {
                $projectIntegration->update([
                    'github_last_error_code' => GithubIntegrationErrorClassifier::TOKEN_UNREADABLE_CODE,
                    'github_last_error_message' => GithubIntegrationErrorClassifier::TOKEN_UNREADABLE_MESSAGE,
                    'github_last_failed_sync_at' => now(),
                    'github_consecutive_failures' => $projectIntegration->github_consecutive_failures + 1,
                ]);
            }
        } elseif ($projectIntegration->github_status === 'pending') {
            $this->syncFromRelay($projectIntegration);
        }

        return [
            'status' => $projectIntegration->github_status,
            'installUrl' => $projectIntegration->github_status === 'pending' ? $projectIntegration->github_install_url : null,
            'repository' => $projectIntegration->github_repository_owner
                ? ['owner' => $projectIntegration->github_repository_owner, 'name' => $projectIntegration->github_repository_name]
                : null,
            'repositories' => $this->githubRepositoryRepository->getForIntegration($projectIntegration)
                ->map(fn ($repository) => [
                    'id' => $repository->repository_id,
                    'owner' => $repository->owner,
                    'name' => $repository->name,
                ])
                ->values()
                ->all(),
            'connectedAt' => $projectIntegration->github_connected_at?->toIso8601String(),
            'health' => $this->healthService->determine($projectIntegration)?->value,
            'lastSuccessfulSyncAt' => $projectIntegration->github_last_synced_at?->toIso8601String(),
            'lastSyncAttemptAt' => $projectIntegration->github_last_sync_attempt_at?->toIso8601String(),
            'lastFailedSyncAt' => $projectIntegration->github_last_failed_sync_at?->toIso8601String(),
            'errorMessage' => $projectIntegration->github_last_error_message,
            'pendingEventCount' => $projectIntegration->github_pending_event_count,
            'pendingEventCountCapped' => $projectIntegration->github_pending_event_count === OrbitRelayClient::EVENTS_PAGE_LIMIT,
        ];
    }

    /**
     * @throws ValidationException if there is nothing connected to rotate
     */
    public function rotateToken(Project $project): void
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, self::INTEGRATION_KEY);
        $relayToken = $projectIntegration?->resolveGithubRelayToken();

        if (! $projectIntegration || ! $relayToken || $projectIntegration->github_status !== 'connected') {
            throw ValidationException::withMessages([
                'integration' => 'GitHub is not connected for this project.',
            ]);
        }

        $newToken = $this->relayClient->rotateToken($relayToken);

        // A single column update is already atomic at the database level —
        // there is no intermediate state where both the old and new token
        // are persisted together.
        $projectIntegration->update(['github_relay_token' => $newToken]);
    }

    /**
     * Queues one sync cycle for this project's GitHub integration - the
     * exact same GithubIntegrationSynchronizer the scheduler uses (see
     * PollGithubRelayEvents), via SyncGithubIntegrationJob, so there's no
     * separate "retry" sync logic to keep correct. Queued rather than run
     * inline so the triggering web request returns immediately instead of
     * blocking on up to 50 sequential relay requests. A no-op if nothing is
     * connected.
     */
    public function retrySync(Project $project): void
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, self::INTEGRATION_KEY);

        if (! $projectIntegration) {
            return;
        }

        SyncGithubIntegrationJob::dispatch($projectIntegration);
    }

    private function syncFromRelay(ProjectIntegration $projectIntegration): void
    {
        $relayToken = $projectIntegration->resolveGithubRelayToken();

        if (! $relayToken) {
            return;
        }

        try {
            $connection = $this->relayClient->getConnection($relayToken);
        } catch (Throwable) {
            // Transient orbit-api failure: leave the row as-is, the next
            // poll tick will try again.
            return;
        }

        if ($connection->status !== 'connected') {
            return;
        }

        $projectIntegration->update([
            'github_status' => 'connected',
            'github_installation_id' => $connection->installationId,
            'github_repository_id' => $connection->repositoryId,
            'github_repository_owner' => $connection->repositoryOwner,
            'github_repository_name' => $connection->repositoryName,
            'github_connected_at' => $connection->connectedAt,
            'github_last_synced_at' => now(),
            'github_install_url' => null,
        ]);

        $this->githubRepositoryRepository->syncForIntegration($projectIntegration, array_map(
            fn ($repository) => ['id' => $repository->id, 'owner' => $repository->owner, 'name' => $repository->name],
            $connection->repositories,
        ));

        $this->activityLogService->log($projectIntegration->project_id, 'Connected the "github" integration');
    }

    /**
     * Re-fetches this project's repository list from orbit-api and
     * reconciles the local table to match exactly (add missing, remove
     * anything no longer returned) - used by the "Manage repositories"
     * settings action. A no-op if nothing is connected.
     */
    public function syncRepositories(Project $project): void
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, self::INTEGRATION_KEY);
        $relayToken = $projectIntegration?->resolveGithubRelayToken();

        if (! $projectIntegration || ! $relayToken || $projectIntegration->github_status !== 'connected') {
            return;
        }

        $repositories = $this->relayClient->listRepositories($relayToken);

        $this->githubRepositoryRepository->syncForIntegration($projectIntegration, array_map(
            fn ($repository) => ['id' => $repository->id, 'owner' => $repository->owner, 'name' => $repository->name],
            $repositories,
        ));
    }

    /**
     * @throws ValidationException if there is nothing connected to add a repository to
     * @throws OrbitRelayApiException if orbit-api rejects the repository (e.g. GITHUB_REPOSITORY_NOT_ALLOWED)
     */
    public function addRepository(Project $project, int $repositoryId): void
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, self::INTEGRATION_KEY);
        $relayToken = $projectIntegration?->resolveGithubRelayToken();

        if (! $projectIntegration || ! $relayToken || $projectIntegration->github_status !== 'connected') {
            throw ValidationException::withMessages([
                'integration' => 'GitHub is not connected for this project.',
            ]);
        }

        $repository = $this->relayClient->addRepository($relayToken, $repositoryId);

        $this->githubRepositoryRepository->syncForIntegration($projectIntegration, [
            ...$this->githubRepositoryRepository->getForIntegration($projectIntegration)
                ->map(fn ($existing) => ['id' => $existing->repository_id, 'owner' => $existing->owner, 'name' => $existing->name])
                ->all(),
            ['id' => $repository->id, 'owner' => $repository->owner, 'name' => $repository->name],
        ]);

        $this->activityLogService->log($project->id, "Connected the \"$repository->owner/$repository->name\" repository");
    }

    /**
     * Only removes the local mapping and asks orbit-api to stop routing
     * webhook events for it - every ExternalIssueLink already created from
     * this repository's events is left untouched, matching the "no
     * historical data lost" requirement for repository removal.
     */
    public function removeRepository(Project $project, int $repositoryId): void
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, self::INTEGRATION_KEY);
        $relayToken = $projectIntegration?->resolveGithubRelayToken();

        if (! $projectIntegration || ! $relayToken) {
            return;
        }

        $githubRepository = $this->githubRepositoryRepository->findByRepositoryId($projectIntegration, $repositoryId);

        if (! $githubRepository) {
            return;
        }

        $this->relayClient->removeRepository($relayToken, $repositoryId);

        $this->activityLogService->log($project->id, "Disconnected the \"$githubRepository->owner/$githubRepository->name\" repository");

        $this->githubRepositoryRepository->delete($githubRepository);
    }
}
