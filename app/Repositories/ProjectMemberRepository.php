<?php

namespace App\Repositories;

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\Role;
use Illuminate\Database\Eloquent\Collection;

class ProjectMemberRepository
{
    public function getMembers(Project $project): Collection
    {
        $members = $project->users()->get();

        $rolesByPivotId = ProjectUser::with('roles')
            ->whereIn('id', $members->pluck('pivot.id'))
            ->get()
            ->keyBy('id');

        $members->each(
            fn ($member) => $member->pivot->setRelation('roles', $rolesByPivotId[$member->pivot->id]->roles)
        );

        return $members;
    }

    public function isMember(Project $project, int $userId): bool
    {
        return $project->users()->where('users.id', $userId)->exists();
    }

    public function roleOf(Project $project, int $userId): ?RoleType
    {
        $pivot = $project->users()->where('users.id', $userId)->first()?->pivot;

        return $pivot ? RoleType::from($pivot->role) : null;
    }

    public function updateRole(Project $project, int $userId, RoleType $role): void
    {
        $project->users()->updateExistingPivot($userId, ['role' => $role->value]);
    }

    public function removeMember(Project $project, int $userId): void
    {
        $project->users()->detach($userId);
    }

    public function syncRoles(Project $project, int $userId, array $roleIds): void
    {
        $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $userId)->first();

        $projectUser?->roles()->sync($roleIds);
    }

    /**
     * Grants the given custom roles in addition to whatever the member already
     * holds — unlike syncRoles(), this never detaches their current system role.
     */
    public function attachRoles(Project $project, int $userId, array $roleIds): void
    {
        $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $userId)->first();

        $projectUser?->roles()->syncWithoutDetaching($roleIds);
    }

    public function syncSystemRole(Project $project, int $userId, Role $targetSystemRole, array $systemRoleIds): void
    {
        $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $userId)->first();

        if (! $projectUser) {
            return;
        }

        $projectUser->roles()->detach($systemRoleIds);
        $projectUser->roles()->attach($targetSystemRole->id);
    }
}
