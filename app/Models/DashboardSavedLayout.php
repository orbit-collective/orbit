<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A named arrangement of dashboard widgets a user keeps to come back to.
 */
class DashboardSavedLayout extends Model
{
    protected $fillable = [
        'user_id',
        'name',
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
