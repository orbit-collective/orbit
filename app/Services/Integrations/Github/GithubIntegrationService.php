<?php

namespace App\Services\Integrations\Github;

use App\Models\Project;
use App\Models\ProjectIntegration;
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
        protected GithubIntegrationSynchronizer $synchronizer,
        protected ActivityLogService $activityLogService,
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

        if (! $projectIntegration || ! $projectIntegration->github_relay_token || $projectIntegration->github_status === 'revoked') {
            return;
        }

        try {
            $this->relayClient->revoke($projectIntegration->github_relay_token);
        } catch (OrbitRelayApiException) {
            // Revoking is best-effort against orbit-api: even if the relay
            // is unreachable, Orbit Local must still stop trusting this
            // connection locally (see MVP spec — disconnect never needs to
            // guarantee the remote side also tore down).
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
     *
     * @return array{status: string, installUrl: ?string, repository: ?array{owner: string, name: string}, connectedAt: ?string}
     */
    public function getConnectStatus(Project $project): array
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, self::INTEGRATION_KEY);

        if (! $projectIntegration || ! $projectIntegration->github_relay_token) {
            return ['status' => 'not_connected', 'installUrl' => null, 'repository' => null, 'connectedAt' => null];
        }

        if ($projectIntegration->github_status === 'pending') {
            $this->syncFromRelay($projectIntegration);
        }

        return [
            'status' => $projectIntegration->github_status,
            'installUrl' => $projectIntegration->github_status === 'pending' ? $projectIntegration->github_install_url : null,
            'repository' => $projectIntegration->github_repository_owner
                ? ['owner' => $projectIntegration->github_repository_owner, 'name' => $projectIntegration->github_repository_name]
                : null,
            'connectedAt' => $projectIntegration->github_connected_at?->toIso8601String(),
        ];
    }

    /**
     * @throws ValidationException if there is nothing connected to rotate
     */
    public function rotateToken(Project $project): void
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, self::INTEGRATION_KEY);

        if (! $projectIntegration || ! $projectIntegration->github_relay_token || $projectIntegration->github_status !== 'connected') {
            throw ValidationException::withMessages([
                'integration' => 'GitHub is not connected for this project.',
            ]);
        }

        $newToken = $this->relayClient->rotateToken($projectIntegration->github_relay_token);

        // A single column update is already atomic at the database level —
        // there is no intermediate state where both the old and new token
        // are persisted together.
        $projectIntegration->update(['github_relay_token' => $newToken]);
    }

    /**
     * Manually runs one sync cycle for this project's GitHub integration -
     * the exact same GithubIntegrationSynchronizer the scheduler uses (see
     * PollGithubRelayEvents), so there's no separate "retry" code path to
     * keep correct. A no-op if nothing is connected, or if a sync for this
     * integration is already in progress (the synchronizer's own lock).
     */
    public function retrySync(Project $project): void
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, self::INTEGRATION_KEY);

        if (! $projectIntegration) {
            return;
        }

        $this->synchronizer->sync($projectIntegration);
    }

    private function syncFromRelay(ProjectIntegration $projectIntegration): void
    {
        try {
            $connection = $this->relayClient->getConnection($projectIntegration->github_relay_token);
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

        $this->activityLogService->log($projectIntegration->project_id, 'Connected the "github" integration');
    }
}
