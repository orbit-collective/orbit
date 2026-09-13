<?php

namespace App\Models;

use Database\Factories\IssueFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Issue extends Model
{
    /** @use HasFactory<IssueFactory> */
    use HasFactory;

    /**
     * Serialize eager-loaded relations under their camelCase names so the
     * Inertia payload matches resources/js/types/Issues.ts - without this,
     * issueType()/workflowStatus() arrive as issue_type/workflow_status and
     * the type and status columns silently render as empty.
     */
    public static $snakeAttributes = false;

    protected $fillable = [
        'id',
        'title',
        'description',
        'status',
        'priority',
        'project_id',
        'parent_id',
        'issue_type_id',
        'workflow_status_id',
        'user_id',
        'assignee_id',
        'labels',
        'custom_fields',
        'start_date',
        'end_date',
    ];

    protected function casts(): array
    {
        return [
            'labels' => 'array',
            'custom_fields' => 'array',
            'tags' => 'array',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Issue::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Issue::class, 'parent_id');
    }

    public function externalLinks(): HasMany
    {
        return $this->hasMany(ExternalIssueLink::class);
    }

    public function issueType(): BelongsTo
    {
        return $this->belongsTo(IssueType::class);
    }

    public function workflowStatus(): BelongsTo
    {
        return $this->belongsTo(WorkflowStatus::class);
    }
}
