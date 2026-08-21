<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Role;
use App\Repositories\RoleRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class RoleService
{
    public function __construct(
        protected RoleRepository $roleRepository,
        protected ActivityLogService $activityLogService
    ) {}

    public function getRoles(Project $project): Collection
    {
        return $this->roleRepository->getForProject($project);
    }

    public function createRole(Project $project, array $data): Role
    {
        $role = $this->roleRepository->create($project, $data);

        $this->activityLogService->log($project->id, "Created the \"$role->name\" role");

        return $role;
    }

    public function updateRole(Project $project, Role $role, array $data): Role
    {
        $this->assertEditable($role);

        $role = $this->roleRepository->update($role, $data);

        $this->activityLogService->log($project->id, "Updated the \"$role->name\" role");

        return $role;
    }

    public function deleteRole(Project $project, Role $role): void
    {
        $this->assertEditable($role);

        $this->roleRepository->delete($role);

        $this->activityLogService->log($project->id, "Deleted the \"$role->name\" role");
    }

    public function syncPermissions(Project $project, Role $role, array $permissionIds): Role
    {
        $this->assertEditable($role);

        $role = $this->roleRepository->syncPermissions($role, $permissionIds);

        $this->activityLogService->log($project->id, "Updated permissions for the \"$role->name\" role");

        return $role;
    }

    private function assertEditable(Role $role): void
    {
        if ($role->is_system) {
            throw ValidationException::withMessages([
                'role' => 'System roles cannot be modified or deleted.',
            ]);
        }
    }
}
