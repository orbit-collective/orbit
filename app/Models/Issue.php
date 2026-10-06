<?php

namespace App\Models;

use Database\Factories\IssueFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;
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
     *
     * The number comes from a counter on the project that is advanced with a
     * single `UPDATE ... SET next_issue_number = next_issue_number + 1`, then
     * read back inside the same transaction. That statement is atomic on every
     * driver (SQLite serializes writers, MySQL/PostgreSQL hold the row lock
     * until commit), so two concurrent creates can never be handed the same
     * number. `lockForUpdate()` is not an option: it is a no-op on SQLite.
     *
     * The counter is never rewound, so a number is not reused after a delete -
     * a stale "#12" in a comment or branch name can't end up pointing at a
     * different issue.
     */
    protected static function booted(): void
    {
        static::creating(function (Issue $issue) {
            if (! $issue->project_id) {
                return;
            }

            if ($issue->number !== null) {
                // Keep the counter ahead of any number set by hand (imports,
                // factories, restores), so the next automatic number is free.
                Project::query()
                    ->whereKey($issue->project_id)
                    ->where('next_issue_number', '<=', $issue->number)
                    ->update(['next_issue_number' => $issue->number + 1]);

                return;
            }

            $issue->number = DB::transaction(function () use ($issue) {
                $projects = Project::query()->whereKey($issue->project_id);

                if ($projects->increment('next_issue_number') === 0) {
                    throw (new ModelNotFoundException)->setModel(Project::class, [$issue->project_id]);
                }

                return (int) Project::query()->whereKey($issue->project_id)->value('next_issue_number') - 1;
            });
        });
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
