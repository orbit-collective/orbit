<?php

namespace App\Services;

use App\Models\Priority;
use App\Models\Project;
use App\Repositories\PriorityRepository;
use App\Repositories\ProjectRepository;
use App\Support\Cache\CacheVersion;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PriorityService
{
    /**
     * The starter scale every project gets on first use, most important
     * first. Like the label taxonomy it is seeded exactly once per project
     * (see ensureSystemPriorities()) and is fully editable afterwards, so
     * this list only decides what a project that has not been seeded yet
     * starts with.
     */
    public const array SYSTEM_PRIORITIES = [
        ['name' => 'High', 'color' => '#f44336', 'icon' => 'SignalHigh', 'position' => 0, 'is_default' => false],
        ['name' => 'Medium', 'color' => '#ff9800', 'icon' => 'SignalMedium', 'position' => 1, 'is_default' => true],
        ['name' => 'Low', 'color' => '#4caf50', 'icon' => 'SignalLow', 'position' => 2, 'is_default' => false],
    ];

    public function __construct(
        protected PriorityRepository $priorityRepository,
        protected ProjectRepository $projectRepository,
        protected ActivityLogService $activityLogService,
    ) {}

    /**
     * Seeds the project's starter priorities exactly once, guarded by
     * projects.priorities_seeded_at rather than "insert whatever is missing",
     * which would resurrect a priority an owner deliberately deleted.
     */
    public function ensureSystemPriorities(Project $project): void
    {
        if ($project->priorities_seeded_at !== null) {
            return;
        }

        foreach (self::SYSTEM_PRIORITIES as $definition) {
            $this->priorityRepository->firstOrCreateSystemPriority($project, $definition);
        }

        $project->forceFill(['priorities_seeded_at' => now()])->save();
    }

    /** @return Collection<int, Priority> */
    public function getPriorities(Project $project): Collection
    {
        $this->ensureSystemPriorities($project);

        return $this->priorityRepository->getForProject($project);
    }

    /**
     * The priorities with how many issues use each, for the settings tab
     * (and the "move its issues to..." choice when deleting one).
     *
     * @return Collection<int, Priority>
     */
    public function getPrioritiesWithIssueCounts(Project $project): Collection
    {
        $this->ensureSystemPriorities($project);

        return $this->priorityRepository->getForProjectWithIssueCounts($project);
    }

    /** The priority a new issue gets when none is chosen. */
    public function defaultFor(Project $project): ?Priority
    {
        $this->ensureSystemPriorities($project);

        return $this->priorityRepository->findDefault($project);
    }

    /** The project's priority with this id, or null when it belongs to another project. */
    public function findInProject(Project $project, int $id): ?Priority
    {
        return $this->priorityRepository->findForProject($project, $id);
    }

    /** Resolves a priority by name (case-insensitive), or null when the project has none by that name. */
    public function findByName(Project $project, string $name): ?Priority
    {
        $this->ensureSystemPriorities($project);

        return $this->priorityRepository->findByName($project, $name);
    }

    /**
     * The id of the project's priority with the given name (case-insensitive),
     * or null. Used where only a project id is at hand, e.g. when an issue
     * resolves the name it was assigned.
     */
    public function idByName(int $projectId, string $name): ?int
    {
        $project = $this->projectRepository->findById($projectId);

        return $project ? $this->findByName($project, $name)?->id : null;
    }

    /** The id of the project's default priority, seeding the starter scale first. */
    public function defaultId(int $projectId): ?int
    {
        $project = $this->projectRepository->findById($projectId);

        return $project ? $this->defaultFor($project)?->id : null;
    }

    public function createPriority(Project $project, array $data): Priority
    {
        $this->ensureSystemPriorities($project);
        $this->assertNameAvailable($project, $data['name']);

        $priority = DB::transaction(function () use ($project, $data) {
            $priority = $this->priorityRepository->create($project, [
                'name' => trim($data['name']),
                'color' => $data['color'],
                'icon' => $data['icon'],
                'position' => $this->priorityRepository->nextPosition($project),
                'is_default' => false,
            ]);

            if (! empty($data['is_default'])) {
                $this->priorityRepository->makeDefault($priority);
            }

            $this->activityLogService->log($project->id, "Created the \"$priority->name\" priority");

            return $priority;
        });

        return $priority->refresh();
    }

    public function updatePriority(Project $project, Priority $priority, array $data): Priority
    {
        // Everything that depends on the priority's current state runs inside
        // the transaction, under a lock on the project and on a fresh copy:
        // two overlapping renames would otherwise each rewrite the references
        // from the name they loaded, and leave the other's name behind.
        $priority = DB::transaction(function () use ($project, $priority, $data) {
            $this->priorityRepository->lockProject($project);

            $priority = $this->priorityRepository->findForProject($project, $priority->id);

            if ($priority === null) {
                throw ValidationException::withMessages([
                    'priority' => 'This priority no longer exists.',
                ]);
            }

            if (array_key_exists('name', $data) && mb_strtolower(trim($data['name'])) !== mb_strtolower($priority->name)) {
                $this->assertNameAvailable($project, $data['name']);
            }

            if (($data['is_default'] ?? null) === false && $priority->is_default) {
                throw ValidationException::withMessages([
                    'is_default' => 'Choose another priority as the default instead of unsetting this one.',
                ]);
            }

            $previousName = $priority->name;

            $priority = $this->priorityRepository->update($priority, array_filter([
                'name' => isset($data['name']) ? trim($data['name']) : null,
                'color' => $data['color'] ?? null,
                'icon' => $data['icon'] ?? null,
            ], fn ($value) => $value !== null));

            if ($priority->name !== $previousName) {
                $this->priorityRepository->replaceNameReferences($project, $previousName, $priority->name);
            }

            if (! empty($data['is_default'])) {
                $this->priorityRepository->makeDefault($priority);
            }

            $this->activityLogService->log($project->id, "Updated the \"$priority->name\" priority");

            return $priority;
        });

        CacheVersion::bump(CacheVersion::ISSUES);

        return $priority->refresh();
    }

    /**
     * Deletes a priority. Its issues move to `$replacement` (or are left
     * without a priority), text copies of its name are rewritten or removed,
     * and the default flag passes on if it was the default. A project always
     * keeps at least one priority.
     */
    public function deletePriority(Project $project, Priority $priority, ?Priority $replacement = null): void
    {
        $this->ensureSystemPriorities($project);

        if ($replacement && ($replacement->project_id !== $project->id || $replacement->is($priority))) {
            throw ValidationException::withMessages([
                'replacement_id' => 'Choose a different priority of this project to move the issues to.',
            ]);
        }

        // The checks that depend on what is left run inside the transaction,
        // under a lock on the project, and on fresh copies: two overlapping
        // deletes would otherwise both pass an unlocked count, or act on a
        // default flag the other one just moved.
        DB::transaction(function () use ($project, $priority, $replacement) {
            $this->priorityRepository->lockProject($project);

            $priority = $this->priorityRepository->findForProject($project, $priority->id);

            if ($priority === null) {
                throw ValidationException::withMessages([
                    'priority' => 'This priority no longer exists.',
                ]);
            }

            if ($replacement) {
                $replacement = $this->priorityRepository->findForProject($project, $replacement->id);

                if ($replacement === null) {
                    throw ValidationException::withMessages([
                        'replacement_id' => 'Choose a different priority of this project to move the issues to.',
                    ]);
                }
            }

            if ($this->priorityRepository->getForProject($project)->count() <= 1) {
                throw ValidationException::withMessages([
                    'priority' => 'A project needs at least one priority.',
                ]);
            }

            $this->priorityRepository->moveIssues($priority, $replacement);
            $this->priorityRepository->replaceNameReferences($project, $priority->name, $replacement?->name);
            $this->priorityRepository->removeFromSavedFilters($project, $priority->id);
            $this->priorityRepository->delete($priority);

            $this->priorityRepository->repackPositions($project);

            if ($priority->is_default) {
                $this->priorityRepository->makeDefault(
                    $replacement?->refresh() ?? $this->priorityRepository->getForProject($project)->first()
                );
            }

            $this->activityLogService->log($project->id, "Deleted the \"$priority->name\" priority");
        });

        // The bulk UPDATE of the issues fires no model event, and the models
        // bump while the transaction is still open: bump once it is committed.
        CacheVersion::bump(CacheVersion::ISSUES);
    }

    /**
     * @param  list<int>  $orderedIds  every priority id of the project, most important first
     */
    public function reorder(Project $project, array $orderedIds): void
    {
        $existing = $this->getPriorities($project)->pluck('id')->sort()->values()->all();
        $given = collect($orderedIds)->map(fn ($id) => (int) $id)->unique()->sort()->values()->all();

        if ($existing !== $given || count($orderedIds) !== count($existing)) {
            throw ValidationException::withMessages([
                'order' => 'The order must list every priority of the project exactly once.',
            ]);
        }

        DB::transaction(fn () => $this->priorityRepository->reorder($project, array_map('intval', $orderedIds)));

        $this->activityLogService->log($project->id, 'Reordered the priorities');

        // Cached issue lists carry each priority's position: retire them once
        // the new order is committed.
        CacheVersion::bump(CacheVersion::ISSUES);
    }

    private function assertNameAvailable(Project $project, string $name): void
    {
        if ($this->priorityRepository->findByName($project, $name)) {
            throw ValidationException::withMessages([
                'name' => "A priority named \"$name\" already exists in this project.",
            ]);
        }
    }
}
