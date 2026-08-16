<?php

namespace App\Providers;

use App\Repositories\EloquentNotificationSettingRepository;
use App\Repositories\NotificationSettingRepository;
use Illuminate\Cache\RateLimiting\Limit;
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
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Mailtrap's sandbox (and most real SMTP providers) throttle how many
        // messages can be sent per second. Queued mail notifications are
        // rate-limited through this rather than firing all at once, so a
        // burst of notifications (e.g. several fields changing on one issue)
        // gets spaced out instead of tripping the provider's limit.
        RateLimiter::for('emails', fn () => Limit::perSecond(2));
    }
}
