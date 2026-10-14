<?php

namespace App\Console\Commands;

use App\Services\NotificationRetentionService;
use Illuminate\Console\Command;

/**
 * Runs every user's notification clean-up schedule that is due (configured in
 * Settings > Notifications). Scheduled hourly in routes/console.php; each
 * schedule decides for itself whether a full daily/weekly/monthly period has
 * passed, so running it more often than needed is harmless.
 */
class PruneOldNotifications extends Command
{
    protected $signature = 'notifications:prune';

    protected $description = 'Delete old notifications and activity history for users whose clean-up schedule is due';

    public function handle(NotificationRetentionService $retentionService): int
    {
        $ran = $retentionService->runDue();

        $this->info("Ran $ran notification clean-up schedule(s).");

        return self::SUCCESS;
    }
}
