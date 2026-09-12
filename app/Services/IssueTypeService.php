<?php

namespace App\Services;

use App\Enums\WorkflowStatusCategory;
use App\Models\Issue;
use App\Models\IssueType;
use App\Models\Project;
use App\Repositories\IssueTypeRepository;
use App\Repositories\WorkflowRepository;
use Illuminate\Database\Eloquent\Collection;

class IssueTypeService
{
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
        ['name' => 'Task', 'icon' => 'CheckSquare', 'color' => '#3b82f6', 'description' => 'A unit of work to be done.'],
        ['name' => 'Feature', 'icon' => 'Sparkles', 'color' => '#6366f1', 'description' => 'A new capability or request.'],
        ['name' => 'Story', 'icon' => 'BookOpen', 'color' => '#22c55e', 'description' => 'A user-facing piece of functionality.'],
        ['name' => 'Bug', 'icon' => 'Bug', 'color' => '#ef4444', 'description' => 'Something isn’t working as expected.'],
        ['name' => 'Epic', 'icon' => 'Zap', 'color' => '#a855f7', 'description' => 'A large body of work that can be broken down into smaller issues.', 'allows_children' => true],
        ['name' => 'Spike', 'icon' => 'Microscope', 'color' => '#06b6d4', 'description' => 'A time-boxed investigation into an unknown.'],
        ['name' => 'Chore', 'icon' => 'Wrench', 'color' => '#78716c', 'description' => 'Maintenance work with no direct user impact.'],
        ['name' => 'Improvement', 'icon' => 'TrendingUp', 'color' => '#14b8a6', 'description' => 'An enhancement to something that already exists.'],
        ['name' => 'Incident', 'icon' => 'Flame', 'color' => '#f97316', 'description' => 'An active production issue requiring attention.'],
        ['name' => 'Security', 'icon' => 'Shield', 'color' => '#b91c1c', 'description' => 'A security concern or vulnerability.'],
        ['name' => 'Infrastructure', 'icon' => 'Server', 'color' => '#64748b', 'description' => 'Work related to infrastructure or tooling.'],
        ['name' => 'Research', 'icon' => 'FlaskConical', 'color' => '#8b5cf6', 'description' => 'Open-ended exploration or analysis.'],
        ['name' => 'Experiment', 'icon' => 'TestTube', 'color' => '#eab308', 'description' => 'A trial to validate a hypothesis.'],
        ['name' => 'Documentation', 'icon' => 'FileText', 'color' => '#0ea5e9', 'description' => 'Writing or updating documentation.'],
        ['name' => 'Design', 'icon' => 'Palette', 'color' => '#ec4899', 'description' => 'Visual, layout, or interaction design work.'],
        ['name' => 'AI Task', 'icon' => 'Bot', 'color' => '#10b981', 'description' => 'A task intended to be carried out by an AI agent.'],
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
        if ($project->issue_types_seeded_at !== null) {
            return;
        }

        foreach (self::SYSTEM_ISSUE_TYPES as $definition) {
            $issueType = $this->issueTypeRepository->firstOrCreateSystemType($project, $definition);
            $this->ensureDefaultWorkflow($issueType);
        }

        $this->backfillExistingIssues($project);

        $project->forceFill(['issue_types_seeded_at' => now()])->save();
    }

    public function getIssueTypes(Project $project): Collection
    {
        $this->ensureSystemIssueTypes($project);

        return $this->issueTypeRepository->getForProject($project);
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
