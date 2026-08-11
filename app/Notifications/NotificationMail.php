<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * The single mail template used for every notification type. Its content is
 * whatever title/message/action URL the triggering call site already built
 * for the in-app notification, so adding a new NotificationType never
 * requires a new Notification/Mailable class.
 */
class NotificationMail extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $title,
        public readonly string $body,
        public readonly ?string $actionUrl = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject($this->title)
            ->greeting("Hello {$notifiable->name}!")
            ->line($this->body);

        if ($this->actionUrl) {
            $mail->action('View in Orbit', $this->actionUrl);
        }

        return $mail;
    }
}
