<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A user's arrangement of the dashboard widgets.
 */
class DashboardLayout extends Model
{
    public const VERSION = 1;

    protected $fillable = [
        'user_id',
        'widgets',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'widgets' => 'array',
            'version' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
