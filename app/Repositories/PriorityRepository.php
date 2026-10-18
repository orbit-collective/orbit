<?php

namespace App\Repositories;

use App\Models\Priority;
use App\Models\Project;
use Illuminate\Database\Eloquent\Collection;

class PriorityRepository
{
    /** @return Collection<int, Priority> */
    public function getForProject(Project $project): Collection
    {
        return $project->priorities()->orderBy('position')->orderBy('id')->get();
    }

    public function findForProject(Project $project, int $id): ?Priority
    {
        return $project->priorities()->whereKey($id)->first();
    }

    /** Case-insensitive, so "high" finds the priority named "High". */
    public function findByName(Project $project, string $name): ?Priority
    {
        return $project->priorities()->whereRaw('lower(name) = ?', [mb_strtolower(trim($name))])->first();
    }

    public function findDefault(Project $project): ?Priority
    {
        return $project->priorities()->where('is_default', true)->orderBy('position')->first();
    }

    public function firstOrCreateSystemPriority(Project $project, array $definition): Priority
    {
        return $project->priorities()->firstOrCreate(
            ['name' => $definition['name']],
            [
                'color' => $definition['color'],
                'icon' => $definition['icon'],
                'position' => $definition['position'],
                'is_default' => $definition['is_default'],
            ],
        );
    }

    public function nextPosition(Project $project): int
    {
        $max = $project->priorities()->max('position');

        return $max === null ? 0 : ((int) $max) + 1;
    }

    public function create(Project $project, array $data): Priority
    {
        return $project->priorities()->create($data);
    }

    public function update(Priority $priority, array $data): Priority
    {
        $priority->update($data);

        return $priority;
    }

    /** Makes the given priority the project's only default. */
    public function makeDefault(Priority $priority): void
    {
        $priority->project->priorities()->whereKeyNot($priority->id)->where('is_default', true)->get()
            ->each(fn (Priority $other) => $other->update(['is_default' => false]));

        if (! $priority->is_default) {
            $priority->update(['is_default' => true]);
        }
    }

    /**
     * Writes the order of a project's priorities: the ids' index becomes the
     * position. Saved one by one (not as a single UPDATE) so the issue lists
     * cached under the issues version are retired by the model events.
     *
     * @param  list<int>  $orderedIds
     */
    public function reorder(Project $project, array $orderedIds): void
    {
        $priorities = $project->priorities()->get()->keyBy('id');

        foreach ($orderedIds as $position => $id) {
            $priorities[$id]->update(['position' => $position]);
        }
    }
}
