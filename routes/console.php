<?php

use App\Console\Commands\PollGithubRelayEvents;
use App\Console\Commands\PruneOldNotifications;
use Illuminate\Support\Facades\Schedule;

// Roughly once a minute is the MVP target from the integration spec - fast
// enough to feel responsive without hammering orbit-api.
Schedule::command(PollGithubRelayEvents::class)->everyMinute();

// Users choose a daily/weekly/monthly clean-up of old notifications and activity
// history in Settings > Notifications; this hourly tick runs whichever are due.
Schedule::command(PruneOldNotifications::class)->hourly()->withoutOverlapping();
