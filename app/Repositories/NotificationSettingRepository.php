<?php

namespace App\Repositories;

use App\Enums\Notifications\NotificationChannel;
use App\Enums\Notifications\NotificationType;
use App\Models\NotificationSetting;
use App\Models\User;
use Illuminate\Support\Collection;

interface NotificationSettingRepository
{
    public function find(User $user, NotificationType $type, NotificationChannel $channel): ?NotificationSetting;

    public function getForUser(User $user): Collection;

    public function updateOrCreate(User $user, NotificationType $type, NotificationChannel $channel, bool $enabled): NotificationSetting;
}
