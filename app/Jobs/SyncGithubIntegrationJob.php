<?php

namespace App\Jobs;

use App\Models\ProjectIntegration;
use App\Services\Integrations\Github\GithubIntegrationSynchronizer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Runs one GithubIntegrationSynchronizer::sync() cycle on the queue -
 * dispatched by the manual "Retry sync" action (see
 * GithubIntegrationController::retry()) so that web request returns
 * immediately instead of blocking on up to 50 sequential relay requests, any
 * of which can take up to the relay client's own timeout. The scheduled
 * poller (PollGithubRelayEvents) calls the synchronizer directly instead,
 * since an Artisan command isn't a web request and has nothing to block.
 *
 * A single try: the synchronizer never throws under normal operation (every
 * failure is caught, classified, and recorded on the integration itself,
 * which is also how retries already happen - the next scheduled poll or
 * another manual retry). A queue-level retry here would just repeat that
 * same recorded failure, not fix anything.
 */
class SyncGithubIntegrationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(
        public readonly ProjectIntegration $projectIntegration,
    ) {}

    public function handle(GithubIntegrationSynchronizer $synchronizer): void
    {
        $synchronizer->sync($this->projectIntegration);
    }
}
