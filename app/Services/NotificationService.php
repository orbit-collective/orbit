<?php

namespace App\Services;

use App\Enums\Notifications\NotificationChannel;
use App\Enums\Notifications\NotificationType;
use App\Models\Notification;
use App\Repositories\NotificationRepository;
use Illuminate\Support\Collection;

class NotificationService
{
    public function __construct(
        protected NotificationRepository $notificationRepository,
        protected NotificationSettingService $notificationSettingService,
        protected NotificationMailService $notificationMailService
    ) {}

    public function getAllForUser(int $userId): Collection
    {
        return $this->notificationRepository->getAllForUser($userId);
    }

    public function store(array $data): Notification
    {
        return $this->notificationRepository->store($data);
    }

    public function update(Notification $notification, array $data): Notification
    {
        return $this->notificationRepository->update($notification, $data);
    }

    public function markAllAsReadForUser(int $userId): int
    {
        return $this->notificationRepository->markAllAsReadForUser($userId);
    }

    /**
     * Notify a single recipient on every channel they've enabled for the given
     * notification type: email via NotificationMailService, and in-app by
     * persisting a Notification row (skipped entirely if in-app is disabled).
     */
    public function notify(int $userId, NotificationType $notificationType, string $type, string $title, string $message, ?string $actionUrl = null): ?Notification
    {
        $this->notificationMailService->send($userId, $notificationType, $title, $message, $actionUrl);

        if (! $this->notificationSettingService->isEnabled($userId, $notificationType, NotificationChannel::InApp)) {
            return null;
        }

        return $this->notificationRepository->store([
            'user_id' => $userId,
            'notification_type' => $notificationType,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'read' => false,
            'action_url' => $actionUrl,
        ]);
    }
}
