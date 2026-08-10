<?php

namespace App\Models;

use App\Enums\Notifications\NotificationChannel;
use App\Enums\Notifications\NotificationType;
use Illuminate\Database\Eloquent\Model;

class NotificationSetting extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'channel',
        'enabled',
    ];

    protected function casts(): array
    {
        return [
            'type' => NotificationType::class,
            'channel' => NotificationChannel::class,
            'enabled' => 'boolean',
        ];
    }
}
