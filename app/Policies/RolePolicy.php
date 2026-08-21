<?php

namespace App\Policies;

use App\Enums\Permissions\Permission;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;

class RolePolicy
{
    public function create(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::ROLES_CREATE);
    }

    public function update(User $user, Role $role): bool
    {
        return $role->project->hasPermission($user, Permission::ROLES_UPDATE);
    }

    public function delete(User $user, Role $role): bool
    {
        return $role->project->hasPermission($user, Permission::ROLES_DELETE);
    }
}
