<?php

namespace App\Models;

use App\Models\Concerns\BumpsIssueCache;
use App\Support\Cache\CacheVersion;
use Database\Factories\IssueFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Issue extends Model
{
    /** @use HasFactory<IssueFactory> */
    use BumpsIssueCache, HasFactory;

    /**
     * Serialize eager-loaded relations under their camelCase names so the
     * Inertia payload matches resources/js/types/Issues.ts - without this,
     * issueType()/workflowStatus() arrive as issue_type/workflow_status and
     * the type and status columns silently render as empty.
     */
    public static $snakeAttributes = false;

    /**
     * Label names assigned through `labels` that still have to be written to
     * the issue_label pivot (see setLabelsAttribute()).
     *
     * @var list<string>|null
     */
    protected ?array $pendingLabelNames = null;

    protected $fillable = [
        'id',
        'number',
        'title',
        'description',
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
            'custom_fields' => 'array',
            'tags' => 'array',
        ];
    }

    /**
     * Assigning `labels` takes label names (what forms, imports, templates and
     * automations all speak) and writes them to the issue_label pivot once the
     * issue is saved, so `fill()`, `create()` and `update()` keep working with
     * names while storage is relational. Names that are not a label of the
     * issue's project are ignored.
     *
     * @param  array<array-key, string>|null  $names
     */
    public function setLabelsAttribute(?array $names): void
    {
        $this->pendingLabelNames = array_values(array_unique(array_map('strval', $names ?? [])));
    }

    /**
     * Overridden rather than hooked on the `saved` event so the pending label
     * names are written even when model events are faked or muted.
     *
     * @param  array<string, mixed>  $options
     */
    public function save(array $options = []): bool
    {
        $saved = parent::save($options);

        if ($saved && $this->pendingLabelNames !== null) {
            $this->syncLabelNames($this->pendingLabelNames);
        }

        return $saved;
    }

    /** @param  list<string>  $names */
    public function syncLabelNames(array $names): void
    {
        $this->pendingLabelNames = null;

        $ids = $names === []
            ? []
            : Label::query()->where('project_id', $this->project_id)->whereIn('name', $names)->pluck('id')->all();

        $changes = $this->labels()->sync($ids);

        $this->load('labels');

        if (array_filter($changes)) {
            CacheVersion::bump(CacheVersion::ISSUES);
        }
    }

    /** @return list<string> */
    public function labelNames(): array
    {
        return $this->labels->pluck('name')->sort()->values()->all();
    }

    /**
     * The payload keeps `labels` as a list of names (what resources/js/types
     * Issues.ts expects) instead of serialising the Label rows.
     */
    public function relationsToArray(): array
    {
        $relations = parent::relationsToArray();

        if ($this->relationLoaded('labels')) {
            $relations['labels'] = $this->labelNames();
        }

        return $relations;
    }

    public function labels(): BelongsToMany
    {
        return $this->belongsToMany(Label::class, 'issue_label')->orderBy('labels.name');
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
