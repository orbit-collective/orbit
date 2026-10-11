<?php

namespace App\Repositories;

use App\Models\Notification;
use Illuminate\Database\Eloquent\Collection;

class NotificationRepository
{
    /**
     * How many notifications are ever loaded for one user. They ride along on
     * every page as a shared Inertia prop, so an account that never clears its
     * inbox must not make every request heavier forever.
     */
    public const int LIMIT = 100;

    /**
     * The user's newest notifications, at most LIMIT of them.
     */
    public function getAllForUser(int $userId): Collection
    {
        return Notification::query()
            ->where('user_id', $userId)
            ->latest()
            ->orderByDesc('id')
            ->limit(self::LIMIT)
            ->get();
    }

    public function store(array $data): Notification
    {
        return Notification::query()->create($data);
    }

    public function update(Notification $notification, array $data): Notification
    {
        $notification->update($data);

        return $notification;
    }

    public function delete(Notification $notification): void
    {
        $notification->delete();
    }

    public function markAllAsReadForUser(int $userId): int
    {
        return Notification::query()
            ->where('user_id', $userId)
            ->where('read', false)
            ->update(['read' => true]);
    }
}
