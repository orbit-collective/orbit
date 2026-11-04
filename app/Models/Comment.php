<?php

namespace App\Models;

use App\Models\Concerns\BroadcastsLiveChanges;
use Database\Factories\CommentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Gate;

class Comment extends Model
{
    /** @use HasFactory<CommentFactory> */
    use BroadcastsLiveChanges, HasFactory;

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

    /** A comment is shown with its issue, so clients refresh that issue. */
    protected function liveChange(): ?array
    {
        $projectId = Issue::query()->whereKey($this->issue_id)->value('project_id');

        return $projectId ? ['project' => $projectId, 'type' => 'comment', 'id' => $this->issue_id] : null;
    }
}
