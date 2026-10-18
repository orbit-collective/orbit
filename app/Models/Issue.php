<?php

namespace App\Models;

use App\Models\Concerns\BumpsIssueCache;
use App\Services\PriorityService;
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

    /**
     * The priority name assigned through `priority` that still has to be
     * resolved to a priority_id once the issue's project is known (see
     * setPriorityAttribute()), and whether it was assigned at all - an
     * explicit null clears the priority, while "never assigned" lets a new
     * issue take the project's default.
     */
    protected ?string $pendingPriorityName = null;

    protected bool $priorityAssigned = false;

    /**
     * Priorities are tiny and every issue payload shows one, so they are
     * always eager-loaded rather than left to each listing query to remember.
     *
     * @var list<string>
     */
    protected $with = ['priority'];

    protected $fillable = [
        'id',
        'number',
        'title',
        'description',
        'priority',
        'priority_id',
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
        // A new issue with no priority of its own takes the project's default.
        // Done here, like the number below, so factories and imports get it
        // too.
        static::creating(function (Issue $issue) {
            if ($issue->project_id && $issue->priority_id === null && ! $issue->priorityAssigned) {
                $issue->priority_id = app(PriorityService::class)->defaultId($issue->project_id);
            }
        });

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
        $touchesPriority = $this->priorityAssigned || ! $this->exists;

        $this->resolvePendingPriority();

        $saved = parent::save($options);

        $this->priorityAssigned = false;

        if ($saved && $touchesPriority) {
            $this->unsetRelation('priority')->load('priority');
        }

        if ($saved && $this->pendingLabelNames !== null) {
            $this->syncLabelNames($this->pendingLabelNames);
        }

        return $saved;
    }

    /**
     * Assigning `priority` takes a priority name (what forms, imports,
     * templates and automations all speak); it is turned into priority_id when
     * the issue is saved. A name the project has no priority for leaves the
     * priority as it was, and null clears it.
     */
    public function setPriorityAttribute(?string $name): void
    {
        $this->priorityAssigned = true;

        if ($name === null || trim($name) === '') {
            $this->pendingPriorityName = null;
            $this->attributes['priority_id'] = null;

            return;
        }

        $this->pendingPriorityName = trim($name);

        // With the project already known (an update, or `project_id` filled
        // first) the name is resolved at once, so a filled model reads back
        // the new priority before it is saved; otherwise save() does it.
        if ($this->project_id) {
            $this->resolvePendingPriority();
        }
    }

    private function resolvePendingPriority(): void
    {
        if ($this->pendingPriorityName === null || ! $this->project_id) {
            return;
        }

        $id = app(PriorityService::class)->idByName($this->project_id, $this->pendingPriorityName);

        if ($id !== null) {
            $this->attributes['priority_id'] = $id;
        }

        $this->pendingPriorityName = null;
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

        // `priority` stays the priority's name (what resources/js/types
        // Issues.ts expects), with its color, icon and position beside it so
        // a row can draw itself without the project's list.
        if ($this->relationLoaded('priority')) {
            $relations['priority'] = $this->priority?->name;
            $relations['priorityDetails'] = $this->priority?->toDetails();
        }

        return $relations;
    }

    public function priority(): BelongsTo
    {
        return $this->belongsTo(Priority::class);
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
