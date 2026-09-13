<?php

namespace App\Repositories;

use App\Models\IssueType;
use App\Models\Project;
use Illuminate\Database\Eloquent\Collection;

class IssueTypeRepository
{
    public function getForProject(Project $project): Collection
    {
        return $project->issueTypes()
            ->with([
                'statuses' => fn ($query) => $query->orderBy('sort_order'),
                'transitions',
                'templates' => fn ($query) => $query->orderBy('name'),
                'allowedChildTypes',
            ])
            ->orderBy('is_system', 'desc')->orderBy('sort_order')->orderBy('name')->get();
    }

    public function findForProject(Project $project, string $name): ?IssueType
    {
        return $project->issueTypes()->where('name', $name)->first();
    }

    public function firstOrCreateSystemType(Project $project, array $definition): IssueType
    {
        return $project->issueTypes()->firstOrCreate(
            ['name' => $definition['name']],
            [
                'icon' => $definition['icon'],
                'color' => $definition['color'],
                'description' => $definition['description'] ?? null,
                'is_system' => true,
                'allows_children' => $definition['allows_children'] ?? false,
                'required_fields' => $definition['required_fields'] ?? [],
                'restricted_role_types' => $definition['restricted_role_types'] ?? [],
                'sort_order' => $definition['sort_order'] ?? 0,
            ],
        );
    }

    public function create(Project $project, array $data): IssueType
    {
        return $project->issueTypes()->create($data);
    }

    public function update(IssueType $issueType, array $data): IssueType
    {
        $issueType->update($data);

        return $issueType;
    }

    public function delete(IssueType $issueType): void
    {
        $issueType->delete();
    }

    public function syncAllowedChildTypes(IssueType $issueType, array $childIssueTypeIds): void
    {
        $issueType->allowedChildTypes()->sync($childIssueTypeIds);
    }
}
