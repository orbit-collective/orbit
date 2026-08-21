<?php

namespace App\Services;

use App\Enums\Permissions\Permission;
use App\Enums\ProjectRole;
use App\Models\Permission as PermissionModel;
use App\Models\Project;
use App\Models\Role;
use App\Repositories\ProjectMemberRepository;
use App\Repositories\RoleRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Validation\ValidationException;

class RoleService
{
    /**
     * The baseline a plain project member gets out of the box: full control over
     * issues and comments, but no ability to manage members, roles, or settings.
     * Admins get every permission (see defaultPermissionsFor()), so this list only
     * needs to cover the "member" tier.
     */
    private const array MEMBER_DEFAULT_PERMISSIONS = [
        Permission::PROJECT_VIEW,
        Permission::MEMBERS_VIEW,
        Permission::ROLES_VIEW,
        Permission::SETTINGS_VIEW,
        Permission::ISSUES_VIEW,
        Permission::ISSUES_CREATE,
        Permission::ISSUES_UPDATE,
        Permission::ISSUES_DELETE,
        Permission::ISSUES_ASSIGN,
        Permission::ISSUES_CHANGE_STATUS,
        Permission::ISSUES_CHANGE_PRIORITY,
        Permission::ISSUES_CHANGE_LABELS,
        Permission::COMMENTS_CREATE,
        Permission::COMMENTS_UPDATE_OWN,
        Permission::COMMENTS_UPDATE_ANY,
        Permission::COMMENTS_DELETE_OWN,
        Permission::COMMENTS_DELETE_ANY,
    ];

    public function __construct(
        protected RoleRepository $roleRepository,
        protected ProjectMemberRepository $projectMemberRepository,
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

    /**
     * Creates the project's system roles (one per ProjectRole tier) on first use
     * and keeps their permissions in sync with the current defaults, so existing
     * projects created before this system existed get backfilled lazily.
     *
     * @return SupportCollection<string, Role> keyed by ProjectRole value
     */
    public function ensureSystemRoles(Project $project): SupportCollection
    {
        return collect(ProjectRole::cases())->mapWithKeys(function (ProjectRole $role) use ($project) {
            $systemRole = $this->roleRepository->firstOrCreateSystemRole($project, $role);

            $this->roleRepository->syncPermissions($systemRole, $this->defaultPermissionIdsFor($role));

            return [$role->value => $systemRole];
        });
    }

    public function syncSystemRoleForMember(Project $project, int $userId, ProjectRole $role): void
    {
        $systemRoles = $this->ensureSystemRoles($project);

        $this->projectMemberRepository->syncSystemRole(
            $project,
            $userId,
            $systemRoles[$role->value],
            $systemRoles->pluck('id')->all(),
        );
    }

    private function defaultPermissionIdsFor(ProjectRole $role): array
    {
        $keys = match ($role) {
            ProjectRole::ADMIN => array_map(fn (Permission $permission) => $permission->value, Permission::cases()),
            ProjectRole::MEMBER => array_map(fn (Permission $permission) => $permission->value, self::MEMBER_DEFAULT_PERMISSIONS),
        };

        return PermissionModel::query()->whereIn('key', $keys)->pluck('id')->all();
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
