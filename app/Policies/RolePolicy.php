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
        return $this->hasRolesOrSettingsAccess($user, $project, Permission::ROLES_CREATE);
    }

    public function update(User $user, Role $role): bool
    {
        return $this->hasRolesOrSettingsAccess($user, $role->project, Permission::ROLES_UPDATE);
    }

    public function delete(User $user, Role $role): bool
    {
        return $this->hasRolesOrSettingsAccess($user, $role->project, Permission::ROLES_DELETE);
    }

    public function assign(User $user, Project $project): bool
    {
        return $this->hasRolesOrSettingsAccess($user, $project, Permission::ROLES_ASSIGN);
    }

    /**
     * A blanket "settings.update" grant acts as a super-permission over the whole
     * roles/permissions area, on top of the specific roles.* ability — so someone
     * trusted with general settings access doesn't need every roles.* permission
     * granted individually.
     */
    private function hasRolesOrSettingsAccess(User $user, Project $project, Permission $permission): bool
    {
        return $project->hasPermission($user, $permission)
            || $project->hasPermission($user, Permission::SETTINGS_UPDATE);
    }
}
