<?php

namespace App\Repositories;

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\Role;
use App\Support\Cache\CacheVersion;
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
        $role = Role::query()
            ->where('is_system', true)
            ->whereHas('members', fn ($query) => $query
                ->where('project_user.project_id', $project->id)
                ->where('project_user.user_id', $userId))
            ->value('role');

        return $role ? RoleType::from($role) : null;
    }

    public function removeMember(Project $project, int $userId): void
    {
        $project->users()->detach($userId);
        CacheVersion::bump(CacheVersion::MEMBERSHIP);
    }

    /**
     * Replaces the member's custom roles with the given ones. Their system
     * role (the tier) is kept as it is.
     */
    public function syncRoles(Project $project, int $userId, array $roleIds): void
    {
        $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $userId)->first();

        if ($projectUser) {
            $systemRoleIds = $projectUser->roles()->where('is_system', true)->pluck('roles.id')->all();
            $projectUser->roles()->sync([...$systemRoleIds, ...$roleIds]);
        }

        CacheVersion::bump(CacheVersion::MEMBERSHIP);
    }

    /**
     * Grants the given custom roles in addition to whatever the member already
     * holds — unlike syncRoles(), this never detaches their current system role.
     */
    public function attachRoles(Project $project, int $userId, array $roleIds): void
    {
        $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $userId)->first();

        $projectUser?->roles()->syncWithoutDetaching($roleIds);
        CacheVersion::bump(CacheVersion::MEMBERSHIP);
    }

    public function syncSystemRole(Project $project, int $userId, Role $targetSystemRole, array $systemRoleIds): void
    {
        $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $userId)->first();

        if (! $projectUser) {
            return;
        }

        $projectUser->roles()->detach($systemRoleIds);
        $projectUser->roles()->attach($targetSystemRole->id);
        CacheVersion::bump(CacheVersion::MEMBERSHIP);
    }
}
