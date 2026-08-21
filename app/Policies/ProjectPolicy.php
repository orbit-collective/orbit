<?php

namespace App\Policies;

use App\Enums\Permissions\Permission;
use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function view(User $user, Project $project): bool
    {
        return $project->users()->where('users.id', $user->id)->exists();
    }

    public function update(User $user, Project $project): bool
    {
        return $this->view($user, $project);
    }

    public function updateDetails(User $user, Project $project): bool
    {
        return $project->hasPermissionOrTier($user, Permission::PROJECT_UPDATE, [RoleType::OWNER, RoleType::ADMIN]);
    }

    public function delete(User $user, Project $project): bool
    {
        return $project->hasPermissionOrTier($user, Permission::PROJECT_DELETE, [RoleType::OWNER]);
    }

    public function inviteMembers(User $user, Project $project): bool
    {
        return $project->hasPermissionOrTier($user, Permission::MEMBERS_INVITE, [RoleType::OWNER, RoleType::ADMIN]);
    }

    public function updateMemberRole(User $user, Project $project): bool
    {
        return $project->hasPermissionOrTier($user, Permission::MEMBERS_UPDATE, [RoleType::OWNER, RoleType::ADMIN]);
    }

    public function removeMember(User $user, Project $project): bool
    {
        return $project->hasPermissionOrTier($user, Permission::MEMBERS_DELETE, [RoleType::OWNER, RoleType::ADMIN]);
    }

    public function transferOwnership(User $user, Project $project): bool
    {
        return $project->users()
            ->where('users.id', $user->id)
            ->wherePivot('role', RoleType::OWNER->value)
            ->exists();
    }
}
