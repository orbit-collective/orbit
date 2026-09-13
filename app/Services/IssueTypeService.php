<?php

namespace App\Services;

use App\Enums\WorkflowStatusCategory;
use App\Models\Issue;
use App\Models\IssueType;
use App\Models\Project;
use App\Models\WorkflowStatus;
use App\Repositories\IssueTypeRepository;
use App\Repositories\WorkflowRepository;
use App\Support\SystemIssueTypeDefaults;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class IssueTypeService
{
    /**
     * The fixed set of issue fields that an issue type can mark as required,
     * mapped to the request/data key each one corresponds to on Issue
     * create/update.
     */
    public const array REQUIRED_FIELD_TO_DATA_KEY = [
        'description' => 'description',
        'assignee' => 'assignee_id',
        'labels' => 'labels',
        'start_date' => 'start_date',
        'end_date' => 'end_date',
        'priority' => 'priority',
    ];

    /**
     * The starter catalog every project gets on first use, mirroring
     * LabelService::SYSTEM_LABELS. Projects created before this system
     * existed are backfilled lazily the first time their issue types are
     * read (see ensureSystemIssueTypes()) rather than through a data
     * migration, so this list is the single source of truth for what
     * "system issue type" means - editing it only affects projects that
     * haven't been seeded yet.
     *
     * Icon values are lucide-react component names, rendered by the
     * frontend's Icon atom. "Task" must stay first/present - existing
     * issues are backfilled onto it in backfillExistingIssues().
     */
    private const array SYSTEM_ISSUE_TYPES = [
        ['name' => 'Task', 'icon' => 'SquareCheck', 'color' => '#3b82f6', 'description' => 'A unit of work to be done.'],
        ['name' => 'Feature', 'icon' => 'Sparkles', 'color' => '#6366f1', 'description' => 'A new capability or request.'],
        ['name' => 'Story', 'icon' => 'BookOpen', 'color' => '#22c55e', 'description' => 'A user-facing piece of functionality.'],
        ['name' => 'Bug', 'icon' => 'Bug', 'color' => '#ef4444', 'description' => 'Something isn’t working as expected.'],
        ['name' => 'Epic', 'icon' => 'Zap', 'color' => '#a855f7', 'description' => 'A large body of work that can be broken down into smaller issues.', 'allows_children' => true],
        ['name' => 'Spike', 'icon' => 'Microscope', 'color' => '#06b6d4', 'description' => 'A time-boxed investigation into an unknown.', 'is_top_level' => false],
        ['name' => 'Chore', 'icon' => 'Wrench', 'color' => '#78716c', 'description' => 'Maintenance work with no direct user impact.', 'is_top_level' => false],
        ['name' => 'Improvement', 'icon' => 'TrendingUp', 'color' => '#14b8a6', 'description' => 'An enhancement to something that already exists.', 'is_top_level' => false],
        ['name' => 'Incident', 'icon' => 'Flame', 'color' => '#f97316', 'description' => 'An active production issue requiring attention.', 'is_top_level' => false],
        ['name' => 'Security', 'icon' => 'Shield', 'color' => '#b91c1c', 'description' => 'A security concern or vulnerability.', 'is_top_level' => false],
        ['name' => 'Infrastructure', 'icon' => 'Server', 'color' => '#64748b', 'description' => 'Work related to infrastructure or tooling.', 'is_top_level' => false],
        ['name' => 'Research', 'icon' => 'FlaskConical', 'color' => '#8b5cf6', 'description' => 'Open-ended exploration or analysis.', 'is_top_level' => false],
        ['name' => 'Experiment', 'icon' => 'TestTube', 'color' => '#eab308', 'description' => 'A trial to validate a hypothesis.', 'is_top_level' => false],
        ['name' => 'Documentation', 'icon' => 'FileText', 'color' => '#0ea5e9', 'description' => 'Writing or updating documentation.', 'is_top_level' => false],
        ['name' => 'Design', 'icon' => 'Palette', 'color' => '#ec4899', 'description' => 'Visual, layout, or interaction design work.', 'is_top_level' => false],
        ['name' => 'AI Task', 'icon' => 'Bot', 'color' => '#10b981', 'description' => 'A task intended to be carried out by an AI agent.', 'is_top_level' => false],
    ];

    /**
     * Every system issue type gets this same default workflow: a simple
     * three-status board. Custom workflows are configured per type from
     * Settings once the Workflow tab lands.
     */
    private const array DEFAULT_WORKFLOW_STATUSES = [
        ['name' => 'To Do', 'color' => '#94a3b8', 'category' => WorkflowStatusCategory::TODO, 'is_initial' => true],
        ['name' => 'In Progress', 'color' => '#f59e0b', 'category' => WorkflowStatusCategory::IN_PROGRESS, 'is_initial' => false],
        ['name' => 'Done', 'color' => '#22c55e', 'category' => WorkflowStatusCategory::DONE, 'is_initial' => false],
    ];

    /**
     * Bumped whenever SystemIssueTypeDefaults gains something new. Projects
     * stamped with an older version get the additions applied on their next
     * read - see applyTypeDefaults(), which only ever adds.
     */
    public const int DEFAULTS_VERSION = 1;

    /** Maps the legacy issues.status enum value to a default-workflow status name, for the one-time backfill. */
    private const array LEGACY_STATUS_TO_DEFAULT_STATUS = [
        'open' => 'To Do',
        'in_progress' => 'In Progress',
        'closed' => 'Done',
    ];

    public function __construct(
        protected IssueTypeRepository $issueTypeRepository,
        protected WorkflowRepository $workflowRepository,
        protected ActivityLogService $activityLogService,
    ) {}

    /**
     * Seeds the project's system issue types (each with a default workflow)
     * and backfills any pre-existing issues onto them, exactly once per
     * project. Guarded by projects.issue_types_seeded_at rather than
     * "insert whatever's missing" - the latter would silently resurrect a
     * system type an owner deliberately deleted.
     */
    public function ensureSystemIssueTypes(Project $project): void
    {
        $isFirstSeed = $project->issue_types_seeded_at === null;

        if ($isFirstSeed) {
            foreach (self::SYSTEM_ISSUE_TYPES as $definition) {
                $this->issueTypeRepository->firstOrCreateSystemType($project, $definition);
            }
        }

        if ($project->issue_type_defaults_version < self::DEFAULTS_VERSION) {
            // One transaction for the whole upgrade: a project half-migrated
            // by a failure part-way through would be retried from the top on
            // every subsequent read, against types already moved on.
            DB::transaction(function () use ($project) {
                $this->applyTypeDefaults($project);

                $project->forceFill(['issue_type_defaults_version' => self::DEFAULTS_VERSION])->save();
            });
        }

        if ($isFirstSeed) {
            // Whatever the defaults didn't give a workflow of its own still
            // needs one before any issue can be backfilled onto it.
            foreach ($project->issueTypes()->get() as $issueType) {
                $this->ensureDefaultWorkflow($issueType);
            }

            $this->backfillExistingIssues($project);

            $project->forceFill(['issue_types_seeded_at' => now()])->save();
        }
    }

    /**
     * Brings a project's system types up to the current defaults. Strictly
     * additive: it never creates a type that isn't there (an owner may have
     * deleted it on purpose), never removes a status, transition, template or
     * field, and never overwrites one that already exists under the same
     * name - so a customized workflow survives untouched.
     */
    private function applyTypeDefaults(Project $project): void
    {
        $typesByName = $project->issueTypes()->get()->keyBy('name');

        foreach (SystemIssueTypeDefaults::all() as $name => $defaults) {
            $issueType = $typesByName->get($name);

            if (! $issueType) {
                continue;
            }

            $this->applyStatusDefaults($issueType, $defaults['statuses'] ?? []);
            $this->applyFieldDefaults($issueType, $defaults['fields'] ?? []);
            $this->applyTemplateDefault($issueType, $defaults['template'] ?? null);

            if (($defaults['allows_children'] ?? false) && ! $issueType->allows_children) {
                $issueType->forceFill(['allows_children' => true])->save();
            }

            $this->applyAllowedChildDefaults($issueType, $defaults['allowed_children'] ?? [], $typesByName);
        }
    }

    /**
     * Adds any missing status of the type's own default workflow, then wires
     * up the transitions implied by their order.
     */
    private function applyStatusDefaults(IssueType $issueType, array $definitions): void
    {
        if ($definitions === []) {
            return;
        }

        $existing = $issueType->statuses()->get();
        $targetNames = array_column($definitions, 'name');
        $genericNames = array_column(SystemIssueTypeDefaults::DEFAULT_STATUSES, 'name');

        // A type still carrying the stock three-status board has never been
        // customized, so swapping it for the type's own workflow is safe -
        // anything else is merged into, never replaced.
        if ($targetNames !== $genericNames && $existing->pluck('name')->sort()->values()->all() === collect($genericNames)->sort()->values()->all()) {
            $this->replaceGenericWorkflow($issueType, $definitions, $existing);

            return;
        }

        $existing = $existing->keyBy('name');
        $ordered = [];

        foreach (array_values($definitions) as $index => $definition) {
            $status = $existing->get($definition['name']);

            $ordered[] = $status ?? $this->workflowRepository->createStatus($issueType, [
                'name' => $definition['name'],
                'color' => $definition['color'],
                'category' => $definition['category'],
                'sort_order' => $index,
                'is_initial' => $index === 0 && $existing->isEmpty(),
            ]);
        }

        foreach ($this->defaultTransitionPairs($definitions) as [$fromIndex, $toIndex]) {
            $from = $ordered[$fromIndex];
            $to = $ordered[$toIndex];

            if (! $this->workflowRepository->transitionExists($issueType, $from->id, $to->id)) {
                $this->workflowRepository->createTransition($issueType, $from, $to);
            }
        }
    }

    /**
     * Swaps the stock workflow for the type's own. A status whose name the
     * new workflow also uses is updated in place rather than recreated -
     * (issue_type_id, name) is unique, so inserting a second "In Progress"
     * before the old one is gone would violate the constraint, and reusing
     * the row keeps every issue already sitting on it exactly where it is.
     *
     * @param  Collection<int, WorkflowStatus>  $oldStatuses
     */
    private function replaceGenericWorkflow(IssueType $issueType, array $definitions, Collection $oldStatuses): void
    {
        $oldByName = $oldStatuses->keyBy('name');
        $reusedIds = [];
        $newStatuses = collect();

        foreach (array_values($definitions) as $index => $definition) {
            $attributes = [
                'color' => $definition['color'],
                'category' => $definition['category'],
                'sort_order' => $index,
                'is_initial' => $index === 0,
            ];

            $reused = $oldByName->get($definition['name']);

            if ($reused) {
                $reusedIds[] = $reused->id;
                $newStatuses->push($this->workflowRepository->updateStatus($reused, $attributes));

                continue;
            }

            $newStatuses->push($this->workflowRepository->createStatus($issueType, [
                'name' => $definition['name'],
                ...$attributes,
            ]));
        }

        $obsolete = $oldStatuses->reject(fn (WorkflowStatus $status) => in_array($status->id, $reusedIds, true));

        foreach ($obsolete as $oldStatus) {
            $replacement = $newStatuses->firstWhere('category', $oldStatus->category) ?? $newStatuses->first();

            Issue::query()
                ->where('workflow_status_id', $oldStatus->id)
                ->update(['workflow_status_id' => $replacement->id]);
        }

        // The whole shape changed, so none of the old edges still make sense.
        $issueType->transitions()->delete();

        WorkflowStatus::query()->whereIn('id', $obsolete->pluck('id'))->delete();

        foreach ($this->defaultTransitionPairs($definitions) as [$fromIndex, $toIndex]) {
            $this->workflowRepository->createTransition($issueType, $newStatuses[$fromIndex], $newStatuses[$toIndex]);
        }
    }

    /**
     * The transitions a linear workflow should have: a step forward, a step
     * back, and a jump straight to any terminal status from anywhere - which
     * is how an issue gets abandoned ("Won't Fix") without walking the chain.
     *
     * @return array<int, array{int, int}>
     */
    private function defaultTransitionPairs(array $definitions): array
    {
        $count = count($definitions);
        $pairs = [];

        for ($i = 0; $i < $count - 1; $i++) {
            $pairs[] = [$i, $i + 1];
            $pairs[] = [$i + 1, $i];
        }

        $doneIndexes = [];
        foreach (array_values($definitions) as $index => $definition) {
            if ($definition['category'] === WorkflowStatusCategory::DONE) {
                $doneIndexes[] = $index;
            }
        }

        foreach (array_keys(array_values($definitions)) as $from) {
            foreach ($doneIndexes as $to) {
                if ($from !== $to && ! in_array([$from, $to], $pairs, true)) {
                    $pairs[] = [$from, $to];
                }
            }
        }

        return $pairs;
    }

    private function applyFieldDefaults(IssueType $issueType, array $definitions): void
    {
        $existing = $issueType->fields()->pluck('label')->all();
        $sortOrder = (int) $issueType->fields()->max('sort_order');

        foreach ($definitions as $definition) {
            if (in_array($definition['label'], $existing, true)) {
                continue;
            }

            $sortOrder++;

            $issueType->fields()->create([
                'label' => $definition['label'],
                'type' => $definition['type'],
                'options' => $definition['options'] ?? [],
                'placeholder' => $definition['placeholder'] ?? null,
                'is_required' => $definition['is_required'] ?? false,
                'sort_order' => $sortOrder,
            ]);
        }
    }

    private function applyTemplateDefault(IssueType $issueType, ?array $template): void
    {
        if (! $template || $issueType->templates()->where('name', $template['name'])->exists()) {
            return;
        }

        $issueType->templates()->create([
            'name' => $template['name'],
            'description' => $template['description'],
            'default_priority' => $template['priority'],
            'default_labels' => $template['labels'],
        ]);
    }

    private function applyAllowedChildDefaults(IssueType $issueType, array $childNames, Collection $typesByName): void
    {
        if ($childNames === [] || $issueType->allowedChildTypes()->exists()) {
            return;
        }

        $ids = collect($childNames)
            ->map(fn (string $name) => $typesByName->get($name)?->id)
            ->filter()
            ->all();

        if ($ids !== []) {
            $issueType->allowedChildTypes()->sync($ids);
        }
    }

    /**
     * Types across several projects, without the lazy system-type seeding
     * getIssueTypes() performs - a read-only view must not write.
     *
     * @param  array<int, int>  $projectIds
     */
    public function getIssueTypesForProjects(array $projectIds): Collection
    {
        return $this->issueTypeRepository->getForProjects($projectIds);
    }

    public function getIssueTypes(Project $project): Collection
    {
        $this->ensureSystemIssueTypes($project);

        return $this->issueTypeRepository->getForProject($project);
    }

    /**
     * The issue type new issues fall back to when none is explicitly chosen
     * (the frontend doesn't offer a picker yet - see the quick-add redesign
     * step of the Issue Types plan).
     */
    public function defaultIssueType(Project $project): IssueType
    {
        $this->ensureSystemIssueTypes($project);

        return $this->issueTypeRepository->findForProject($project, 'Task');
    }

    /**
     * Maps the legacy issues.status enum value to the best-fit status of the
     * given issue type's workflow, by category rather than by exact name -
     * so it still works for a type whose workflow has been customized away
     * from the three default statuses. Falls back to the type's initial
     * status, so every issue always resolves to *something*.
     */
    public function resolveWorkflowStatusForLegacyValue(IssueType $issueType, ?string $legacyStatus): ?WorkflowStatus
    {
        $category = match ($legacyStatus) {
            'open' => WorkflowStatusCategory::TODO,
            'in_progress' => WorkflowStatusCategory::IN_PROGRESS,
            'closed' => WorkflowStatusCategory::DONE,
            default => null,
        };

        $status = $category
            ? $issueType->statuses()->where('category', $category->value)->orderBy('sort_order')->first()
            : null;

        return $status
            ?? $issueType->statuses()->where('is_initial', true)->first()
            ?? $issueType->statuses()->orderBy('sort_order')->first();
    }

    /**
     * The inverse of resolveWorkflowStatusForLegacyValue(): collapses a
     * workflow status back onto the legacy issues.status enum by category,
     * so the old column stays meaningful for board/filter code that still
     * reads it while the workflow is the real source of truth.
     */
    public function legacyValueForWorkflowStatus(WorkflowStatus $status): string
    {
        return match ($status->category) {
            WorkflowStatusCategory::TODO => 'open',
            WorkflowStatusCategory::IN_PROGRESS => 'in_progress',
            WorkflowStatusCategory::DONE => 'closed',
        };
    }

    public function createIssueType(Project $project, array $data): IssueType
    {
        $this->assertNameAvailable($project, $data['name']);

        $issueType = $this->issueTypeRepository->create($project, [
            'name' => $data['name'],
            'icon' => $data['icon'],
            'color' => $data['color'],
            'description' => $data['description'] ?? null,
            'allows_children' => $data['allows_children'] ?? false,
            'is_top_level' => $data['is_top_level'] ?? true,
            'is_system' => false,
            'required_fields' => $data['required_fields'] ?? [],
            'restricted_role_types' => $data['restricted_role_types'] ?? [],
        ]);

        $this->ensureDefaultWorkflow($issueType);

        $this->activityLogService->log($project->id, "Created the \"$issueType->name\" issue type");

        return $issueType;
    }

    public function updateIssueType(Project $project, IssueType $issueType, array $data): IssueType
    {
        if (array_key_exists('name', $data) && $data['name'] !== $issueType->name) {
            $this->assertNameAvailable($project, $data['name']);
        }

        $issueType = $this->issueTypeRepository->update($issueType, $data);

        $this->activityLogService->log($project->id, "Updated the \"$issueType->name\" issue type");

        return $issueType;
    }

    public function deleteIssueType(Project $project, IssueType $issueType): void
    {
        if ($issueType->is_system) {
            throw ValidationException::withMessages([
                'name' => 'A system issue type cannot be deleted.',
            ]);
        }

        if ($issueType->issues()->exists()) {
            throw ValidationException::withMessages([
                'name' => 'Reassign the issues using this type before deleting it.',
            ]);
        }

        $name = $issueType->name;

        $this->issueTypeRepository->delete($issueType);

        $this->activityLogService->log($project->id, "Deleted the \"$name\" issue type");
    }

    /**
     * Replaces the exact set of types allowed as a sub-issue of this type.
     * An empty array means "unrestricted" (any type, gated only by this
     * type's allows_children flag) - see IssueService::assertValidParent().
     */
    public function syncAllowedChildTypes(Project $project, IssueType $issueType, array $childIssueTypeIds): void
    {
        $validIds = $project->issueTypes()
            ->whereIn('id', $childIssueTypeIds)
            ->where('id', '!=', $issueType->id)
            ->pluck('id')
            ->all();

        $this->issueTypeRepository->syncAllowedChildTypes($issueType, $validIds);

        $this->activityLogService->log($project->id, "Updated which issue types can be sub-issues of \"$issueType->name\"");
    }

    /**
     * Enforces the issue type's required_fields against issue create/update
     * data. On create every required field must be present and non-empty.
     * On update, a required field is only checked when the request actually
     * touches it (an untouched required field on an existing issue is left
     * alone - this isn't a full-issue revalidation).
     */
    public function assertRequiredFieldsSatisfied(IssueType $issueType, array $data, bool $isCreate): void
    {
        $missingDataKeys = [];

        foreach ($issueType->required_fields ?? [] as $field) {
            $dataKey = self::REQUIRED_FIELD_TO_DATA_KEY[$field] ?? null;

            if (! $dataKey) {
                continue;
            }

            if ($isCreate) {
                if ($this->isEmptyValue($data[$dataKey] ?? null)) {
                    $missingDataKeys[$dataKey] = true;
                }
            } elseif (array_key_exists($dataKey, $data) && $this->isEmptyValue($data[$dataKey])) {
                $missingDataKeys[$dataKey] = true;
            }
        }

        if ($missingDataKeys) {
            throw ValidationException::withMessages(array_fill_keys(
                array_keys($missingDataKeys),
                'This field is required for the selected issue type.',
            ));
        }
    }

    private function isEmptyValue(mixed $value): bool
    {
        if ($value === null) {
            return true;
        }

        if (is_array($value)) {
            return count($value) === 0;
        }

        if (is_string($value)) {
            return trim($value) === '';
        }

        return false;
    }

    private function assertNameAvailable(Project $project, string $name): void
    {
        if ($this->issueTypeRepository->findForProject($project, $name)) {
            throw ValidationException::withMessages([
                'name' => 'An issue type with this name already exists in this project.',
            ]);
        }
    }

    private function ensureDefaultWorkflow(IssueType $issueType): void
    {
        if ($issueType->statuses()->exists()) {
            return;
        }

        $statuses = collect(self::DEFAULT_WORKFLOW_STATUSES)
            ->values()
            ->map(fn (array $definition, int $index) => $this->workflowRepository->createStatus($issueType, [
                ...$definition,
                'sort_order' => $index,
            ]));

        // A simple default workflow allows moving freely between every
        // status (matches the previous behaviour, where any IssueStatus
        // value could be set at any time).
        foreach ($statuses as $from) {
            foreach ($statuses as $to) {
                if ($from->id !== $to->id) {
                    $this->workflowRepository->createTransition($issueType, $from, $to);
                }
            }
        }
    }

    private function backfillExistingIssues(Project $project): void
    {
        $taskType = $this->issueTypeRepository->findForProject($project, 'Task');

        if (! $taskType) {
            return;
        }

        $statusesByName = $taskType->statuses()->get()->keyBy('name');

        Issue::query()
            ->where('project_id', $project->id)
            ->whereNull('issue_type_id')
            ->each(function (Issue $issue) use ($taskType, $statusesByName) {
                $statusName = self::LEGACY_STATUS_TO_DEFAULT_STATUS[$issue->status] ?? 'To Do';
                $status = $statusesByName->get($statusName) ?? $statusesByName->get('To Do');

                $issue->forceFill([
                    'issue_type_id' => $taskType->id,
                    'workflow_status_id' => $status?->id,
                ])->save();
            });
    }
}
