<?php

namespace App\Enums\Notifications;

enum NotificationChannel: string
{
    case InApp = 'in_app';
    case Email = 'email';

    public function enabledByDefault(): bool
    {
        return match ($this) {
            self::InApp => true,
            self::Email => false,
        };
    }
}
