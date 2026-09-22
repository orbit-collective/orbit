<?php

namespace App\Console\Commands;

use App\Repositories\ProjectIntegrationRepository;
use App\Services\Integrations\Github\GithubIntegrationSynchronizer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Syncs every connected project's GitHub integration, one at a time, via the
 * shared GithubIntegrationSynchronizer (also used by the manual "Retry sync"
 * action - see GithubIntegrationController::retry()). A synchronizer bug for
 * one project must never stop the others, so each call is isolated in its
 * own try/catch on top of whatever isolation the synchronizer already does
 * internally.
 */
class PollGithubRelayEvents extends Command
{
    protected $signature = 'github:poll-relay-events';

    protected $description = 'Sync pending GitHub relay events for every connected project';

    public function handle(
        ProjectIntegrationRepository $projectIntegrationRepository,
        GithubIntegrationSynchronizer $synchronizer,
    ): int {
        $connectedIntegrations = $projectIntegrationRepository->getConnectedGithubIntegrations();

        foreach ($connectedIntegrations as $projectIntegration) {
            try {
                $synchronizer->sync($projectIntegration);
            } catch (Throwable $exception) {
                Log::warning('Unexpected error syncing a GitHub integration', [
                    'projectIntegrationId' => $projectIntegration->id,
                    'projectId' => $projectIntegration->project_id,
                    'exception' => $exception->getMessage(),
                ]);
            }
        }

        return self::SUCCESS;
    }
}
