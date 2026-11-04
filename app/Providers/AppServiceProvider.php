<?php

namespace App\Providers;

use App\Events\CommentAdded;
use App\Events\IssueAssigned;
use App\Events\IssueCreated;
use App\Events\IssueMentioned;
use App\Events\IssuesImported;
use App\Events\IssueUnassigned;
use App\Events\IssueUpdated;
use App\Events\ProjectInvited;
use App\Listeners\NotifyDescriptionMentions;
use App\Listeners\NotifyProjectIntegrationsListener;
use App\Listeners\SendNotificationListener;
use App\Repositories\EloquentNotificationSettingRepository;
use App\Repositories\NotificationSettingRepository;
use App\Support\Live\LiveUpdates;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Queue\Events\JobExceptionOccurred;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Queue\Events\JobProcessed;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(NotificationSettingRepository::class, EloquentNotificationSettingRepository::class);

        $this->app->singleton(LiveUpdates::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        $this->bootLiveUpdates();

        // Mailtrap's sandbox (and most real SMTP providers) throttle how many
        // messages can be sent per second. Queued mail notifications are
        // rate-limited through this rather than firing all at once, so a
        // burst of notifications (e.g. several fields changing on one issue)
        // gets spaced out instead of tripping the provider's limit.
        RateLimiter::for('emails', fn () => Limit::perSecond(2));

        // The palette searches as the user types (debounced), so this is
        // generous; it only stops a runaway client.
        RateLimiter::for('command-palette', fn (Request $request) => Limit::perMinute(120)->by($request->user()?->id ?: $request->ip()));

        // Every notification-worthy event routes through this one listener,
        // which dispatches on the event type internally — see its handle()
        // method for the switch/case. Adding a new notification-worthy event
        // elsewhere in the app only requires adding its class to this list.
        Event::listen([
            IssueAssigned::class,
            IssueUnassigned::class,
            IssueUpdated::class,
            CommentAdded::class,
            IssueMentioned::class,
            ProjectInvited::class,
            IssuesImported::class,
        ], SendNotificationListener::class);

        // "@[Name](id)" mentions in an issue description raise the same
        // IssueMentioned event comments do, handled by the listener above.
        Event::listen([
            IssueCreated::class,
            IssueUpdated::class,
        ], NotifyDescriptionMentions::class);

        // Same event set (minus ProjectInvited, which no integration's
        // sub-options cover yet) also fans out to any project integration
        // that opted into that kind of activity — see
        // NotifyProjectIntegrationsListener for the per-integration dispatch.
        Event::listen([
            IssueAssigned::class,
            IssueUnassigned::class,
            IssueUpdated::class,
            CommentAdded::class,
            IssueCreated::class,
        ], NotifyProjectIntegrationsListener::class);
    }

    /**
     * Live updates are collected during a request or job and sent once it is
     * done (see LiveUpdates), so nothing is broadcast before the response has
     * been prepared and a bulk write is a single event.
     */
    private function bootLiveUpdates(): void
    {
        $flush = function (): void {
            $live = $this->app->make(LiveUpdates::class);

            if ($live->hasPending()) {
                $live->flush();
            }
        };

        $this->app->terminating($flush);
        Event::listen([JobProcessed::class, JobFailed::class, JobExceptionOccurred::class], $flush);

        // A logged error refreshes the Developer Portal's error list. The
        // log file is read by the portal itself; this only says "look again".
        Event::listen(MessageLogged::class, function (MessageLogged $event): void {
            if (in_array($event->level, ['error', 'critical', 'alert', 'emergency'], true)) {
                $this->app->make(LiveUpdates::class)->portal('errors');
            }
        });
    }
}
