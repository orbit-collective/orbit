<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\Middleware\RateLimited;

/**
 * The single mail template used for every notification type. Its content is
 * whatever title/message/action URL the triggering call site already built
 * for the in-app notification, so adding a new NotificationType never
 * requires a new Notification/Mailable class.
 */
class NotificationMail extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Retry a few times on transient SMTP failures (e.g. provider throttling),
     * waiting longer between each attempt instead of hammering it immediately.
     */
    public int $tries = 5;

    public function __construct(
        public readonly string $title,
        public readonly string $body,
        public readonly ?string $actionUrl = null,
    ) {}

    public function backoff(): array
    {
        return [10, 30, 60, 120];
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Throttled so a burst of notifications (e.g. several fields changing on
     * one issue) doesn't exceed the mail provider's per-second send limit.
     */
    public function middleware(object $notifiable, string $channel): array
    {
        return match ($channel) {
            'mail' => [new RateLimited('emails')],
            default => [],
        };
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject($this->title)
            ->greeting("Hello $notifiable->name!")
            ->line($this->body)
            ->line('')
            ->line("You're receiving this because of activity on Orbit. You can fine-tune which notifications reach your inbox at any time from your account settings.");

        if ($this->actionUrl) {
            $mail->action('View in Orbit', $this->actionUrl);
        }

        return $mail->salutation('— The Orbit Team');
    }
}
