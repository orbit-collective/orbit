<?php

namespace App\Models;

use App\Enums\Notifications\NotificationType;
use Database\Factories\NotificationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property mixed $user_id
 */
class Notification extends Model
{
    /** @use HasFactory<NotificationFactory> */
    use HasFactory;

    protected $fillable = [
        'id',
        'user_id',
        'notification_type',
        'type',
        'title',
        'message',
        'read',
        'action_url',
    ];

    protected function casts(): array
    {
        return [
            'notification_type' => NotificationType::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
