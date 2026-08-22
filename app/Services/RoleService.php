<?php

namespace App\Services;

use App\Enums\Permissions\Permission;
use App\Enums\Permissions\RoleType;
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
     * The base RoleType tiers every project gets a system role for. CUSTOM is
     * excluded here — it's not a tier, it's what user-created roles are tagged
     * with.
     */
    private const array SYSTEM_ROLE_TYPES = [
        RoleType::OWNER,
        RoleType::ADMIN,
        RoleType::MEMBER,
        RoleType::VIEWER,
    ];

    /**
     * The baseline a plain project member gets out of the box: full control over
     * their own issues and comments, but no moderation rights over other
     * people's comments, and no ability to manage members, roles, or settings.
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
        Permission::COMMENTS_DELETE_OWN,
    ];

    /**
     * A read-only tier: can see the project, its members, and browse issues,
     * but cannot create/change/manage anything — including the project's own
     * settings/roles area, which stays hidden from this tier.
     */
    private const array VIEWER_DEFAULT_PERMISSIONS = [
        Permission::PROJECT_VIEW,
        Permission::MEMBERS_VIEW,
        Permission::ROLES_VIEW,
        Permission::ISSUES_VIEW,
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
        $this->assertNotOwnerRole($role);

        // The slug is how ensureSystemRoles() finds a project's Admin/Member/Viewer
        // rows again later — letting it change would orphan the role and cause a
        // fresh duplicate (with reset default permissions) to be created next time.
        if ($role->is_system) {
            $data['slug'] = $role->slug;
        }

        $role = $this->roleRepository->update($role, $data);

        $this->activityLogService->log($project->id, "Updated the \"$role->name\" role");

        return $role;
    }

    public function deleteRole(Project $project, Role $role): void
    {
        $this->assertNotSystemRole($role);

        $this->roleRepository->delete($role);

        $this->activityLogService->log($project->id, "Deleted the \"$role->name\" role");
    }

    public function syncPermissions(Project $project, Role $role, array $permissionIds): Role
    {
        $this->assertNotOwnerRole($role);

        $role = $this->roleRepository->syncPermissions($role, $permissionIds);

        $this->activityLogService->log($project->id, "Updated permissions for the \"$role->name\" role");

        return $role;
    }

    /**
     * Creates the project's system roles (one per RoleType tier) on first use.
     * Default permissions are only seeded the moment a tier's role is first
     * created — Admin/Member/Viewer can be customized afterwards without this
     * being called again (e.g. whenever another member's role changes)
     * silently reverting that customization. Owner is the exception: its
     * permission set is reset back to "everything" on every call, since it's
     * never editable and must always stay maximal.
     *
     * @return SupportCollection<string, Role> keyed by RoleType value
     */
    public function ensureSystemRoles(Project $project): SupportCollection
    {
        return collect(self::SYSTEM_ROLE_TYPES)->mapWithKeys(function (RoleType $role) use ($project) {
            $systemRole = $this->roleRepository->firstOrCreateSystemRole($project, $role);

            if ($systemRole->wasRecentlyCreated || $role === RoleType::OWNER) {
                $this->roleRepository->syncPermissions($systemRole, $this->defaultPermissionIdsFor($role));
            }

            return [$role->value => $systemRole];
        });
    }

    public function syncSystemRoleForMember(Project $project, int $userId, RoleType $role): void
    {
        $systemRoles = $this->ensureSystemRoles($project);

        $this->projectMemberRepository->syncSystemRole(
            $project,
            $userId,
            $systemRoles[$role->value],
            $systemRoles->pluck('id')->all(),
        );
    }

    private function defaultPermissionIdsFor(RoleType $role): array
    {
        $keys = match ($role) {
            RoleType::OWNER, RoleType::ADMIN => array_map(fn (Permission $permission) => $permission->value, Permission::cases()),
            RoleType::MEMBER => array_map(fn (Permission $permission) => $permission->value, self::MEMBER_DEFAULT_PERMISSIONS),
            RoleType::VIEWER => array_map(fn (Permission $permission) => $permission->value, self::VIEWER_DEFAULT_PERMISSIONS),
            RoleType::CUSTOM => [],
        };

        return PermissionModel::query()->whereIn('key', $keys)->pluck('id')->all();
    }

    private function assertNotOwnerRole(Role $role): void
    {
        if ($role->role === RoleType::OWNER->value) {
            throw ValidationException::withMessages([
                'role' => 'The Owner role always has every permission and cannot be modified.',
            ]);
        }
    }

    private function assertNotSystemRole(Role $role): void
    {
        if ($role->is_system) {
            throw ValidationException::withMessages([
                'role' => 'System roles cannot be deleted.',
            ]);
        }
    }
}
