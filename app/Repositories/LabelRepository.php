<?php

namespace App\Repositories;

use App\Models\Label;
use App\Models\Project;
use Illuminate\Database\Eloquent\Collection;

class LabelRepository
{
    public function getForProject(Project $project): Collection
    {
        return $project->labels()->orderBy('is_system', 'desc')->orderBy('name')->get();
    }

    public function findForProject(Project $project, string $name): ?Label
    {
        return $project->labels()->where('name', $name)->first();
    }

    public function firstOrCreateSystemLabel(Project $project, array $definition): Label
    {
        return $project->labels()->firstOrCreate(
            ['name' => $definition['name']],
            [
                'color' => $definition['color'],
                'description' => $definition['description'] ?? null,
                'is_system' => true,
            ],
        );
    }

    public function create(Project $project, array $data): Label
    {
        return $project->labels()->create($data);
    }

    public function update(Label $label, array $data): Label
    {
        $label->update($data);

        return $label;
    }

    public function delete(Label $label): void
    {
        $label->delete();
    }
}
