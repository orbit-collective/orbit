<?php

namespace App\Repositories;

use App\Enums\Notifications\NotificationChannel;
use App\Enums\Notifications\NotificationType;
use App\Models\NotificationSetting;
use App\Models\User;
use Illuminate\Support\Collection;

final class EloquentNotificationSettingRepository implements NotificationSettingRepository
{
    public function find(User $user, NotificationType $type, NotificationChannel $channel): ?NotificationSetting
    {
        return NotificationSetting::query()
            ->where('user_id', $user->id)
            ->where('type', $type)
            ->where('channel', $channel)
            ->first();
    }

    public function getForUser(User $user): Collection
    {
        return NotificationSetting::query()
            ->where('user_id', $user->id)
            ->get();
    }

    public function updateOrCreate(User $user, NotificationType $type, NotificationChannel $channel, bool $enabled): NotificationSetting
    {
        return NotificationSetting::query()
            ->updateOrCreate(
                [
                    'user_id' => $user->id,
                    'type' => $type,
                    'channel' => $channel,
                ],
                [
                    'enabled' => $enabled,
                ]
            );
    }

}
