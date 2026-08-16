<?php

namespace App\Repositories;

use App\Enums\Notifications\NotificationChannel;
use App\Enums\Notifications\NotificationType;
use App\Models\NotificationSetting;
use Illuminate\Support\Collection;

final class EloquentNotificationSettingRepository implements NotificationSettingRepository
{
    public function find(int $userId, NotificationType $type, NotificationChannel $channel): ?NotificationSetting
    {
        return NotificationSetting::query()
            ->where('user_id', $userId)
            ->where('type', $type)
            ->where('channel', $channel)
            ->first();
    }

    public function getForUser(int $userId): Collection
    {
        return NotificationSetting::query()
            ->where('user_id', $userId)
            ->get();
    }

    public function updateOrCreate(int $userId, NotificationType $type, NotificationChannel $channel, bool $enabled): NotificationSetting
    {
        return NotificationSetting::query()
            ->updateOrCreate(
                [
                    'user_id' => $userId,
                    'type' => $type,
                    'channel' => $channel,
                ],
                [
                    'enabled' => $enabled,
                ]
            );
    }
}
