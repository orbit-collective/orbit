<?php

namespace App\Services;

use App\Models\Priority;
use App\Models\Project;
use App\Repositories\PriorityRepository;
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

    /** The priority a new issue gets when none is chosen. */
    public function defaultFor(Project $project): ?Priority
    {
        $this->ensureSystemPriorities($project);

        return $this->priorityRepository->findDefault($project);
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
        $project = Project::query()->find($projectId);

        return $project ? $this->findByName($project, $name)?->id : null;
    }

    /** The id of the project's default priority, seeding the starter scale first. */
    public function defaultId(int $projectId): ?int
    {
        $project = Project::query()->find($projectId);

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
        if (array_key_exists('name', $data) && mb_strtolower(trim($data['name'])) !== mb_strtolower($priority->name)) {
            $this->assertNameAvailable($project, $data['name']);
        }

        if (($data['is_default'] ?? null) === false && $priority->is_default) {
            throw ValidationException::withMessages([
                'is_default' => 'Choose another priority as the default instead of unsetting this one.',
            ]);
        }

        $priority = DB::transaction(function () use ($project, $priority, $data) {
            $priority = $this->priorityRepository->update($priority, array_filter([
                'name' => isset($data['name']) ? trim($data['name']) : null,
                'color' => $data['color'] ?? null,
                'icon' => $data['icon'] ?? null,
            ], fn ($value) => $value !== null));

            if (! empty($data['is_default'])) {
                $this->priorityRepository->makeDefault($priority);
            }

            $this->activityLogService->log($project->id, "Updated the \"$priority->name\" priority");

            return $priority;
        });

        return $priority->refresh();
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
