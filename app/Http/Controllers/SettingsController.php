<?php

namespace App\Http\Controllers;

use App\Enums\Permissions\Permission as PermissionEnum;
use App\Enums\Permissions\RoleType;
use App\Models\Label;
use App\Models\Permission as PermissionModel;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use App\Services\Integrations\Jira\JiraIntegrationService;
use App\Services\IssueTypeService;
use App\Services\LabelService;
use App\Services\NotificationSettingService;
use App\Services\PermissionService;
use App\Services\ProjectIntegrationService;
use App\Services\ProjectInvitationService;
use App\Services\ProjectMemberService;
use App\Services\ProjectService;
use App\Services\RoleService;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Every settings tab is its own page with its own route
 * (`/settings/<tab>`, route name `settings.<tab>`) so that a request only
 * ever computes and ships the props that one tab actually renders — the
 * page previously served every tab's data on every visit. Shared shape:
 * each method renders `Settings/<Page>` and always passes `projects`,
 * which the Sidebar needs on every settings page; project-scoped tabs
 * additionally pass `memberProjects`/`selectedProjectId` for the project
 * switcher, resolved from the `?project=` query string.
 */
class SettingsController extends Controller
{
    /**
     * Tiers that are allowed to view settings regardless of any explicit
     * permission grant.
     */
    private const VIEW_TIERS = [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER];

    /**
     * Labels and issue types are readable a tier wider than the general
     * settings tabs (see ProjectPolicy::viewLabels()).
     */
    private const CATALOG_VIEW_TIERS = [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER, RoleType::VIEWER];

    private const MANAGE_TIERS = [RoleType::OWNER, RoleType::ADMIN];

    public function __construct(
        protected UserService $userService,
        protected NotificationSettingService $notificationSettingService,
        protected ProjectService $projectService,
        protected ProjectMemberService $projectMemberService,
        protected ProjectInvitationService $projectInvitationService,
        protected RoleService $roleService,
        protected PermissionService $permissionService,
        protected ProjectIntegrationService $projectIntegrationService,
        protected JiraIntegrationService $jiraIntegrationService,
        protected LabelService $labelService,
        protected IssueTypeService $issueTypeService,
    ) {}

    public function preferences(Request $request): Response
    {
        return Inertia::render('Settings/Preferences', [
            'projects' => $this->projects($request),
        ]);
    }

    public function profile(Request $request): Response
    {
        return Inertia::render('Settings/Profile', [
            'projects' => $this->projects($request),
        ]);
    }

    public function notifications(Request $request): Response
    {
        return Inertia::render('Settings/Notifications', [
            'projects' => $this->projects($request),
            'notificationSettings' => $this->notificationSettingService->getAllSettings($request->user()->id),
        ]);
    }

    public function securityAccess(Request $request): Response
    {
        return Inertia::render('Settings/SecurityAccess', [
            'projects' => $this->projects($request),
            'sessions' => $this->userService->getUserSessions($request->user()),
        ]);
    }

    public function labels(Request $request): Response
    {
        $user = $request->user();
        $projects = $this->projects($request);
        $selectedProject = $this->resolveSelectedProject($projects, $request->query('project'));

        $hasLabelsAccess = $selectedProject?->hasPermissionOrTier($user, PermissionEnum::LABELS_VIEW, self::CATALOG_VIEW_TIERS) ?? false;

        return Inertia::render('Settings/Labels', [
            ...$this->projectScope($projects, $selectedProject),
            'labels' => $hasLabelsAccess
                ? $this->mapLabels($this->labelService->getLabels($selectedProject))
                : [],
            'hasLabelsAccess' => $hasLabelsAccess,
            // Deliberately independent of $hasLabelsAccess: a custom role can be
            // granted a mutation permission (e.g. labels.create) without also
            // being granted labels.view, and that grant must still work.
            'canCreateLabels' => $this->can($selectedProject, $user, PermissionEnum::LABELS_CREATE),
            'canUpdateLabels' => $this->can($selectedProject, $user, PermissionEnum::LABELS_UPDATE),
            'canDeleteLabels' => $this->can($selectedProject, $user, PermissionEnum::LABELS_DELETE),
        ]);
    }

    public function issueTypes(Request $request): Response
    {
        $user = $request->user();
        $projects = $this->projects($request);
        $selectedProject = $this->resolveSelectedProject($projects, $request->query('project'));

        $hasIssueTypesAccess = $selectedProject?->hasPermissionOrTier($user, PermissionEnum::ISSUE_TYPES_VIEW, self::CATALOG_VIEW_TIERS) ?? false;
        $hasLabelsAccess = $selectedProject?->hasPermissionOrTier($user, PermissionEnum::LABELS_VIEW, self::CATALOG_VIEW_TIERS) ?? false;

        return Inertia::render('Settings/IssueTypes', [
            ...$this->projectScope($projects, $selectedProject),
            'issueTypes' => $hasIssueTypesAccess
                ? $this->issueTypeService->getIssueTypes($selectedProject)
                : [],
            // Issue type templates pick from the project's labels, so this
            // tab needs the label catalog too.
            'labels' => $hasLabelsAccess
                ? $this->mapLabels($this->labelService->getLabels($selectedProject))
                : [],
            'hasIssueTypesAccess' => $hasIssueTypesAccess,
            'canCreateIssueTypes' => $this->can($selectedProject, $user, PermissionEnum::ISSUE_TYPES_CREATE),
            'canUpdateIssueTypes' => $this->can($selectedProject, $user, PermissionEnum::ISSUE_TYPES_UPDATE),
            'canDeleteIssueTypes' => $this->can($selectedProject, $user, PermissionEnum::ISSUE_TYPES_DELETE),
            'canUpdateWorkflow' => $this->can($selectedProject, $user, PermissionEnum::WORKFLOW_UPDATE),
        ]);
    }

    public function members(Request $request): Response
    {
        $user = $request->user();
        $projects = $this->projects($request);
        $selectedProject = $this->resolveSelectedProject($projects, $request->query('project'));

        $hasRolesAccess = $this->hasRolesAccess($selectedProject, $user);

        return Inertia::render('Settings/Members', [
            ...$this->projectScope($projects, $selectedProject),
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
            // Needed to render the role pickers on each member row.
            'roles' => $hasRolesAccess
                ? $this->mapRoles($this->roleService->getRoles($selectedProject)->loadMissing('members'))
                : [],
            'canAssignRoles' => $selectedProject
                ? $selectedProject->hasPermission($user, PermissionEnum::ROLES_ASSIGN)
                : false,
            'canUpdateProjectDetails' => $this->can($selectedProject, $user, PermissionEnum::PROJECT_UPDATE),
            'canDeleteProject' => $selectedProject
                ? $selectedProject->hasPermissionOrTier($user, PermissionEnum::PROJECT_DELETE, [RoleType::OWNER])
                : false,
        ]);
    }

    public function rolesManagement(Request $request): Response
    {
        $user = $request->user();
        $projects = $this->projects($request);
        $selectedProject = $this->resolveSelectedProject($projects, $request->query('project'));

        $hasSettingsAccess = $selectedProject?->hasPermissionOrTier($user, PermissionEnum::SETTINGS_VIEW, self::VIEW_TIERS) ?? false;
        $hasRolesAccess = $this->hasRolesAccess($selectedProject, $user);

        return Inertia::render('Settings/RolesManagement', [
            ...$this->projectScope($projects, $selectedProject),
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
        ]);
    }

    public function integrations(Request $request): Response
    {
        $user = $request->user();
        $projects = $this->projects($request);
        $selectedProject = $this->resolveSelectedProject($projects, $request->query('project'));

        $hasIntegrationsAccess = $selectedProject?->hasPermissionOrTier($user, PermissionEnum::INTEGRATIONS_VIEW, self::VIEW_TIERS) ?? false;
        $canUpdateIntegrations = $hasIntegrationsAccess
            && $selectedProject->hasPermissionOrTier($user, PermissionEnum::INTEGRATIONS_UPDATE, self::MANAGE_TIERS);

        return Inertia::render('Settings/Integrations', [
            ...$this->projectScope($projects, $selectedProject),
            'integrationStatuses' => $hasIntegrationsAccess
                ? $this->projectIntegrationService->getStatuses($selectedProject)
                : [],
            'integrationSettings' => $hasIntegrationsAccess
                ? $this->mapIntegrationSettings(
                    $this->projectIntegrationService->getSettings($selectedProject),
                    $canUpdateIntegrations,
                )
                : [],
            'hasIntegrationsAccess' => $hasIntegrationsAccess,
            'canUpdateIntegrations' => $canUpdateIntegrations,
            'jiraSettings' => $canUpdateIntegrations
                ? $this->jiraIntegrationService->getSettingsExtras($selectedProject)
                : null,
            // Deliberately separate from jiraSettings above: the frontend
            // polls just this prop while an import is running (see
            // JiraIntegrationService::getImportProgress()'s docblock for
            // why it must not also re-fetch Jira's live mapping metadata).
            'jiraImportProgress' => $canUpdateIntegrations
                ? $this->jiraIntegrationService->getImportProgress($selectedProject)
                : null,
            // Only the import mapping UI reads these, and that is gated on
            // being able to change the integration in the first place.
            'issueTypes' => $canUpdateIntegrations
                ? $this->issueTypeService->getIssueTypes($selectedProject)
                : [],
            'labels' => $canUpdateIntegrations
                ? $this->mapLabels($this->labelService->getLabels($selectedProject))
                : [],
        ]);
    }

    private function projects(Request $request): Collection
    {
        return $this->projectService->getAllForUser($request->user()->id);
    }

    /**
     * Props every project-scoped tab needs for its project switcher.
     */
    private function projectScope(Collection $projects, ?Project $selectedProject): array
    {
        return [
            'projects' => $projects,
            'memberProjects' => $projects->map(fn (Project $project) => [
                'id' => $project->id,
                'name' => $project->name,
                'color' => $project->color,
            ])->values(),
            'selectedProjectId' => $selectedProject?->id,
        ];
    }

    private function can(?Project $project, User $user, PermissionEnum $permission): bool
    {
        return $project?->hasPermissionOrTier($user, $permission, self::MANAGE_TIERS) ?? false;
    }

    private function hasRolesAccess(?Project $project, User $user): bool
    {
        return ($project?->hasPermissionOrTier($user, PermissionEnum::SETTINGS_VIEW, self::VIEW_TIERS) ?? false)
            && $project->hasPermissionOrTier($user, PermissionEnum::ROLES_VIEW, self::VIEW_TIERS);
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
            'roleIds' => $invitation->roles->pluck('id')->values()->all(),
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

    private function mapLabels(Collection $labels): array
    {
        return $labels->map(fn (Label $label) => [
            'id' => $label->id,
            'name' => $label->name,
            'color' => $label->color,
            'description' => $label->description,
            'isSystem' => $label->is_system,
        ])->values()->all();
    }

    /**
     * The webhook URL is a bearer secret — only expose the decrypted value to
     * someone who can actually change it. Everyone else just learns whether
     * one is configured, which is enough to render the settings UI.
     */
    private function mapIntegrationSettings(array $settings, bool $canUpdateIntegrations): array
    {
        return array_map(fn (array $integration) => [
            'enabled' => $integration['enabled'],
            'hasWebhookUrl' => $integration['webhookUrl'] !== null,
            'webhookUrl' => $canUpdateIntegrations ? $integration['webhookUrl'] : null,
            'options' => $integration['options'],
        ], $settings);
    }
}
