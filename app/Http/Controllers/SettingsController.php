<?php

namespace App\Http\Controllers;

use App\Enums\Permissions\Permission as PermissionEnum;
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

        return Inertia::render('Settings/Index', [
            'sessions' => $this->userService->getUserSessions($user),
            'notificationSettings' => $this->notificationSettingService->getAllSettings($user->id),
            'memberProjects' => $projects->map(fn (Project $project) => [
                'id' => $project->id,
                'name' => $project->name,
                'color' => $project->color,
            ])->values(),
            'selectedProjectId' => $selectedProject?->id,
            'viewerRole' => $selectedProject?->users()->where('users.id', $user->id)->first()?->pivot->role,
            'members' => $selectedProject
                ? $this->mapMembers($this->projectMemberService->getMembers($selectedProject))
                : [],
            'pendingInvitations' => $selectedProject
                ? $this->mapInvitations($this->projectInvitationService->getPending($selectedProject))
                : [],
            'roles' => $selectedProject
                ? $this->mapRoles($this->roleService->getRoles($selectedProject)->loadMissing('members'))
                : [],
            'permissions' => $this->mapPermissions($this->permissionService->getAll()),
            'canCreateRoles' => $selectedProject
                ? $selectedProject->hasPermission($user, PermissionEnum::ROLES_CREATE)
                : false,
            'canUpdateRoles' => $selectedProject
                ? $selectedProject->hasPermission($user, PermissionEnum::ROLES_UPDATE)
                : false,
            'canDeleteRoles' => $selectedProject
                ? $selectedProject->hasPermission($user, PermissionEnum::ROLES_DELETE)
                : false,
            'canAssignRoles' => $selectedProject
                ? $selectedProject->hasPermission($user, PermissionEnum::ROLES_ASSIGN)
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
