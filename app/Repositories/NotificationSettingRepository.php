<?php

namespace App\Repositories;

use App\Enums\Notifications\NotificationChannel;
use App\Enums\Notifications\NotificationType;
use App\Models\NotificationSetting;
use Illuminate\Support\Collection;

interface NotificationSettingRepository
{
    public function find(int $userId, NotificationType $type, NotificationChannel $channel): ?NotificationSetting;

    public function getForUser(int $userId): Collection;

    public function updateOrCreate(int $userId, NotificationType $type, NotificationChannel $channel, bool $enabled): NotificationSetting;
}
