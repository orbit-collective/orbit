<?php

namespace App\Repositories;

use App\Enums\ProjectRole;
use App\Models\Project;
use Illuminate\Database\Eloquent\Collection;

class ProjectMemberRepository
{
    public function getMembers(Project $project): Collection
    {
        return $project->users()->get();
    }

    public function isMember(Project $project, int $userId): bool
    {
        return $project->users()->where('users.id', $userId)->exists();
    }

    public function roleOf(Project $project, int $userId): ?ProjectRole
    {
        $pivot = $project->users()->where('users.id', $userId)->first()?->pivot;

        return $pivot ? ProjectRole::from($pivot->role) : null;
    }

    public function countAdmins(Project $project): int
    {
        return $project->users()->wherePivot('role', ProjectRole::ADMIN->value)->count();
    }

    public function updateRole(Project $project, int $userId, ProjectRole $role): void
    {
        $project->users()->updateExistingPivot($userId, ['role' => $role->value]);
    }

    public function removeMember(Project $project, int $userId): void
    {
        $project->users()->detach($userId);
    }
}
