<?php

namespace App\Services;

use App\Enums\Notifications\NotificationChannel;
use App\Enums\Notifications\NotificationType;
use App\Models\Notification;
use App\Repositories\NotificationRepository;
use App\Support\Cache\CachedModels;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class NotificationService
{
    public function __construct(
        protected NotificationRepository $notificationRepository,
        protected NotificationSettingService $notificationSettingService,
        protected NotificationMailService $notificationMailService
    ) {}

    /**
     * Seconds a user's notification list stays cached. Every write below drops
     * it straight away; the TTL only bounds how long a write that bypassed this
     * service (a direct model change) can go unnoticed.
     */
    private const int CACHE_TTL = 300;

    /**
     * The shared Inertia prop on every page, so it is served from the cache
     * rather than queried on each request.
     */
    public function getAllForUser(int $userId): Collection
    {
        $rows = Cache::remember(
            self::cacheKey($userId),
            self::CACHE_TTL,
            fn () => CachedModels::toRows($this->notificationRepository->getAllForUser($userId)),
        );

        return CachedModels::hydrate(Notification::class, $rows);
    }

    public function store(array $data): Notification
    {
        $notification = $this->notificationRepository->store($data);

        $this->forget($notification->user_id);

        return $notification;
    }

    public function update(Notification $notification, array $data): Notification
    {
        $notification = $this->notificationRepository->update($notification, $data);

        $this->forget($notification->user_id);

        return $notification;
    }

    public function delete(Notification $notification): void
    {
        $this->notificationRepository->delete($notification);

        $this->forget($notification->user_id);
    }

    public function markAllAsReadForUser(int $userId): int
    {
        $updated = $this->notificationRepository->markAllAsReadForUser($userId);

        $this->forget($userId);

        return $updated;
    }

    private static function cacheKey(int $userId): string
    {
        return "user:$userId:notifications:rows";
    }

    private function forget(int $userId): void
    {
        Cache::forget(self::cacheKey($userId));
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
