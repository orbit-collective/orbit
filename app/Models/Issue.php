<?php

namespace App\Models;

use Database\Factories\IssueFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

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
        'number',
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

    /**
     * Every issue gets a project-scoped number ("#12") when created, unless
     * one was set explicitly. Done here rather than in the repository so
     * factories and any other creation path are numbered the same way.
     */
    protected static function booted(): void
    {
        static::creating(function (Issue $issue) {
            if ($issue->number !== null || ! $issue->project_id) {
                return;
            }

            $issue->number = DB::transaction(function () use ($issue) {
                $project = Project::query()->lockForUpdate()->findOrFail($issue->project_id);
                $number = self::nextNumberFor($project);

                $project->forceFill(['next_issue_number' => $number + 1])->save();

                return $number;
            });
        });
    }

    /**
     * The project's next issue number. Driven by a counter on the project
     * (not just max(number)+1) so a number is never handed out twice, even
     * after the newest issue is deleted - a stale "#12" in a comment or
     * branch name can't end up pointing at a different issue.
     */
    public static function nextNumberFor(Project $project): int
    {
        return max(
            (int) $project->next_issue_number,
            (int) static::query()->where('project_id', $project->id)->max('number') + 1,
        );
    }

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
