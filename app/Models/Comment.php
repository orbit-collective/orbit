<?php

namespace App\Models;

use Database\Factories\CommentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Gate;

class Comment extends Model
{
    /** @use HasFactory<CommentFactory> */
    use HasFactory;

    protected $fillable = [
        'issue_id',
        'user_id',
        'body',
    ];

    protected $appends = [
        'can_edit',
        'can_delete',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function issue(): BelongsTo
    {
        return $this->belongsTo(Issue::class);
    }

    public function getCanEditAttribute(): bool
    {
        return auth()->check() && Gate::forUser(auth()->user())->allows('update', $this);
    }

    public function getCanDeleteAttribute(): bool
    {
        return auth()->check() && Gate::forUser(auth()->user())->allows('delete', $this);
    }
}
