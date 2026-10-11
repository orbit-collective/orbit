<?php

namespace App\Repositories;

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Support\LikePattern;
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

    /**
     * Projects the user is a member of whose name contains the query, for the
     * command palette. Name prefix ranks above a mere substring, then most
     * recently updated.
     */
    public function searchForUser(int $userId, string $q, int $limit = 5): Collection
    {
        $escape = LikePattern::ESCAPE;

        return Project::query()
            ->whereHas('users', fn ($query) => $query->where('users.id', $userId))
            ->whereRaw("LOWER(projects.name) LIKE ? ESCAPE '{$escape}'", [LikePattern::contains($q)])
            ->orderByRaw("CASE WHEN LOWER(projects.name) LIKE ? ESCAPE '{$escape}' THEN 0 ELSE 1 END", [LikePattern::startsWith($q)])
            ->orderByDesc('projects.updated_at')
            ->orderByDesc('projects.id')
            ->limit($limit)
            ->get();
    }

    public function findBySlug(string $slug): ?Project
    {
        return Project::query()->where('slug', $slug)->firstOrFail();
    }

    public function findById(int $id): ?Project
    {
        return Project::query()->find($id);
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

    /**
     * @return list<int>
     */
    public function getMemberIds(Project $project): array
    {
        return $project->users()->pluck('users.id')->all();
    }

    public function delete(Project $project): void
    {
        $project->delete();
    }
}
