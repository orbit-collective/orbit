<?php

namespace App\Services;

use App\Enums\Notifications\NotificationChannel;
use App\Enums\Notifications\NotificationType;
use App\Notifications\NotificationMail;

/**
 * Single handler for dispatching the email side of a notification. Every
 * NotificationType routes through here, gated by the recipient's own
 * per-type email preference, so new notification types get email support
 * for free without touching this class.
 */
class NotificationMailService
{
    public function __construct(
        protected UserService $userService,
        protected NotificationSettingService $notificationSettingService,
    ) {}

    public function send(int $userId, NotificationType $notificationType, string $title, string $message, ?string $actionUrl = null): void
    {
        if (! $this->notificationSettingService->isEnabled($userId, $notificationType, NotificationChannel::Email)) {
            return;
        }

        $user = $this->userService->getUserById($userId);

        if (! $user) {
            return;
        }

        $user->notify(new NotificationMail($title, $message, $actionUrl));
    }
}
