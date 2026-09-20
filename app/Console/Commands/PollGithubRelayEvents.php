<?php

namespace App\Console\Commands;

use App\Repositories\ProjectIntegrationRepository;
use App\Services\Integrations\Github\GithubRelayEventProcessor;
use App\Services\Integrations\Github\OrbitRelayClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Fetches and processes pending GitHub relay events for every connected
 * project, one project at a time. Each event is processed independently:
 * one project's or one event's failure never stops the others, and an
 * event is only ever acked after GithubRelayEventProcessor::process()
 * returns without throwing (see that class's docblock for the ack-last
 * ordering this relies on).
 */
class PollGithubRelayEvents extends Command
{
    protected $signature = 'github:poll-relay-events';

    protected $description = 'Fetch and process pending GitHub relay events for every connected project';

    public function handle(
        ProjectIntegrationRepository $projectIntegrationRepository,
        OrbitRelayClient $relayClient,
        GithubRelayEventProcessor $processor,
    ): int {
        $connectedIntegrations = $projectIntegrationRepository->getConnectedGithubIntegrations();

        foreach ($connectedIntegrations as $projectIntegration) {
            try {
                $events = $relayClient->listEvents($projectIntegration->github_relay_token);
            } catch (Throwable $exception) {
                Log::warning('Failed to fetch GitHub relay events for a project', [
                    'projectIntegrationId' => $projectIntegration->id,
                    'exception' => $exception->getMessage(),
                ]);

                continue;
            }

            foreach ($events as $event) {
                try {
                    $processor->process($event, $projectIntegration);
                    $relayClient->ackEvent($projectIntegration->github_relay_token, $event->id);
                } catch (Throwable $exception) {
                    // Transient failure (network/API/DB) - leave the event
                    // pending, it will be retried on the next poll tick.
                    Log::warning('Failed to process a GitHub relay event, leaving it pending', [
                        'projectIntegrationId' => $projectIntegration->id,
                        'eventId' => $event->id,
                        'exception' => $exception->getMessage(),
                    ]);
                }
            }

            $projectIntegration->update(['github_last_synced_at' => now()]);
        }

        return self::SUCCESS;
    }
}
