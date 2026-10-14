<?php

namespace App\Models;

use App\Enums\Notifications\RetentionFrequency;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationRetentionSetting extends Model
{
    protected $fillable = [
        'user_id',
        'enabled',
        'frequency',
        'notifications_older_than_days',
        'notifications_only_read',
        'activity_older_than_days',
        'last_run_at',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'frequency' => RetentionFrequency::class,
            'notifications_older_than_days' => 'integer',
            'notifications_only_read' => 'boolean',
            'activity_older_than_days' => 'integer',
            'last_run_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
