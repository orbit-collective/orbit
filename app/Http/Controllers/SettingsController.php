<?php

namespace App\Http\Controllers;

use App\Enums\Permissions\Permission as PermissionEnum;
use App\Enums\Permissions\RoleType;
use App\Models\Permission as PermissionModel;
use App\Models\Project;
use App\Models\Role;
use App\Services\NotificationSettingService;
use App\Services\PermissionService;
use App\Services\ProjectInvitationService;
use App\Services\ProjectMemberService;
use App\Services\ProjectService;
use App\Services\RoleService;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function __construct(
        protected UserService $userService,
        protected NotificationSettingService $notificationSettingService,
        protected ProjectService $projectService,
        protected ProjectMemberService $projectMemberService,
        protected ProjectInvitationService $projectInvitationService,
        protected RoleService $roleService,
        protected PermissionService $permissionService,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $projects = $this->projectService->getAllForUser($user->id);
        $selectedProject = $this->resolveSelectedProject($projects, $request->query('project'));

        $viewTiers = [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER];
        $hasSettingsAccess = $selectedProject?->hasPermissionOrTier($user, PermissionEnum::SETTINGS_VIEW, $viewTiers) ?? false;
        $hasRolesAccess = $hasSettingsAccess && $selectedProject->hasPermissionOrTier($user, PermissionEnum::ROLES_VIEW, $viewTiers);

        return Inertia::render('Settings/Index', [
            'sessions' => $this->userService->getUserSessions($user),
            'notificationSettings' => $this->notificationSettingService->getAllSettings($user->id),
            'memberProjects' => $projects->map(fn (Project $project) => [
                'id' => $project->id,
                'name' => $project->name,
                'color' => $project->color,
            ])->values(),
            'selectedProjectId' => $selectedProject?->id,
            'selectedProjectDetails' => $selectedProject ? [
                'name' => $selectedProject->name,
                'description' => $selectedProject->description,
                'color' => $selectedProject->color,
            ] : null,
            'viewerRole' => $selectedProject?->users()->where('users.id', $user->id)->first()?->pivot->role,
            'members' => $selectedProject
                ? $this->mapMembers($this->projectMemberService->getMembers($selectedProject))
                : [],
            'pendingInvitations' => $selectedProject
                ? $this->mapInvitations($this->projectInvitationService->getPending($selectedProject))
                : [],
            'roles' => $hasRolesAccess
                ? $this->mapRoles($this->roleService->getRoles($selectedProject)->loadMissing('members'))
                : [],
            'permissions' => $hasRolesAccess
                ? $this->mapPermissions($this->permissionService->getAll())
                : [],
            'hasSettingsAccess' => $hasSettingsAccess,
            'canCreateRoles' => $hasRolesAccess && $selectedProject->hasPermission($user, PermissionEnum::ROLES_CREATE),
            'canUpdateRoles' => $hasRolesAccess && $selectedProject->hasPermission($user, PermissionEnum::ROLES_UPDATE),
            'canDeleteRoles' => $hasRolesAccess && $selectedProject->hasPermission($user, PermissionEnum::ROLES_DELETE),
            'canAssignRoles' => $selectedProject
                ? $selectedProject->hasPermission($user, PermissionEnum::ROLES_ASSIGN)
                : false,
            'canUpdateProjectDetails' => $selectedProject
                ? $selectedProject->hasPermissionOrTier($user, PermissionEnum::PROJECT_UPDATE, [RoleType::OWNER, RoleType::ADMIN])
                : false,
            'canDeleteProject' => $selectedProject
                ? $selectedProject->hasPermissionOrTier($user, PermissionEnum::PROJECT_DELETE, [RoleType::OWNER])
                : false,
        ]);
    }

    private function resolveSelectedProject(Collection $projects, ?string $projectId): ?Project
    {
        if ($projectId && $project = $projects->firstWhere('id', (int) $projectId)) {
            return $project;
        }

        return $projects->first();
    }

    private function mapMembers(Collection $members): array
    {
        return $members->map(fn ($member) => [
            'id' => $member->id,
            'name' => $member->name,
            'email' => $member->email,
            'avatar' => $member->avatar,
            'role' => $member->pivot->role,
            'joinedAt' => $member->pivot->created_at,
            'roleIds' => $member->pivot->roles->pluck('id')->values()->all(),
        ])->values()->all();
    }

    private function mapInvitations(Collection $invitations): array
    {
        return $invitations->map(fn ($invitation) => [
            'id' => $invitation->id,
            'email' => $invitation->email,
            'role' => $invitation->role->value,
            'invitedByName' => $invitation->invitedBy?->name,
            'expiresAt' => $invitation->expires_at,
        ])->values()->all();
    }

    private function mapRoles(Collection $roles): array
    {
        return $roles->map(fn (Role $role) => [
            'id' => $role->id,
            'name' => $role->name,
            'slug' => $role->slug,
            'type' => $role->role,
            'isSystem' => $role->is_system,
            'memberCount' => $role->members->count(),
            'permissionIds' => $role->permissions->pluck('id')->values()->all(),
        ])->values()->all();
    }

    private function mapPermissions(Collection $permissions): array
    {
        return $permissions->map(fn (PermissionModel $permission) => [
            'id' => $permission->id,
            'key' => $permission->key,
            'group' => $permission->group,
        ])->values()->all();
    }
}
