<?php

namespace App\Enums\Notifications;

enum NotificationChannel: string
{
    case InApp = 'in_app';
    case Email = 'email';
}
