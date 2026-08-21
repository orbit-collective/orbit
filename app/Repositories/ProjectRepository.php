<?php

namespace App\Repositories;

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use Illuminate\Database\Eloquent\Collection;

class ProjectRepository
{
    public function getAllForUser(int $userId): Collection
    {
        return Project::query()
            ->whereHas('users', fn ($query) => $query->where('users.id', $userId))
            ->latest()
            ->get();
    }

    public function findBySlug(string $slug): ?Project
    {
        return Project::query()->where('slug', $slug)->firstOrFail();
    }

    public function store(array $data): Project
    {
        return Project::query()->create($data);
    }

    public function update(Project $project, array $data): Project
    {
        $project->update($data);

        return $project;
    }

    public function hasAnyProjectsForUser(int $userId): bool
    {
        return Project::query()
            ->whereHas('users', fn ($query) => $query->where('users.id', $userId))
            ->exists();
    }

    public function attachMember(Project $project, int $userId, RoleType $role): void
    {
        $project->users()->attach($userId, ['role' => $role->value]);
    }
}
