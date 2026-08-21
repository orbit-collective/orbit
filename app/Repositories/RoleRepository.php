<?php

namespace App\Repositories;

use App\Models\Project;
use App\Models\Role;
use Illuminate\Database\Eloquent\Collection;

class RoleRepository
{
    public function getForProject(Project $project): Collection
    {
        return $project->roles()->with('permissions')->get();
    }

    public function create(Project $project, array $data): Role
    {
        return $project->roles()->create($data);
    }

    public function update(Role $role, array $data): Role
    {
        $role->update($data);

        return $role;
    }

    public function delete(Role $role): void
    {
        $role->delete();
    }

    public function syncPermissions(Role $role, array $permissionIds): Role
    {
        $role->permissions()->sync($permissionIds);

        return $role->load('permissions');
    }
}
