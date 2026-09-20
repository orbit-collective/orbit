<?php

use App\Console\Commands\PollGithubRelayEvents;
use Illuminate\Support\Facades\Schedule;

// Roughly once a minute is the MVP target from the integration spec - fast
// enough to feel responsive without hammering orbit-api.
Schedule::command(PollGithubRelayEvents::class)->everyMinute();
