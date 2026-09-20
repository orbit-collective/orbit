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

    /**
     * Uploading an image is not a tier of its own: the endpoint serves issue
     * descriptions, comments and issue type templates alike, so it admits
     * anyone who can write to at least one of those. Plain project visibility
     * is not enough - a Viewer has nowhere in the UI to paste an image and
     * must not be able to spend the project's storage from a console either.
     */
    public function uploadAttachments(User $user, Project $project): bool
    {
        $writeGates = [
            Permission::ISSUES_CREATE,
            Permission::ISSUES_UPDATE,
            Permission::COMMENTS_CREATE,
            Permission::ISSUE_TYPES_UPDATE,
        ];

        return array_any($writeGates, fn($permission) => $project->hasPermissionOrTier($user, $permission, [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER]));

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

    public function viewIntegrations(User $user, Project $project): bool
    {
        return $project->hasPermissionOrTier($user, Permission::INTEGRATIONS_VIEW, [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER]);
    }

    public function updateIntegrations(User $user, Project $project): bool
    {
        return $project->hasPermissionOrTier($user, Permission::INTEGRATIONS_UPDATE, [RoleType::OWNER, RoleType::ADMIN]);
    }

    public function viewLabels(User $user, Project $project): bool
    {
        return $project->hasPermissionOrTier($user, Permission::LABELS_VIEW, [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER, RoleType::VIEWER]);
    }

    public function createLabels(User $user, Project $project): bool
    {
        return $project->hasPermissionOrTier($user, Permission::LABELS_CREATE, [RoleType::OWNER, RoleType::ADMIN]);
    }

    public function updateLabels(User $user, Project $project): bool
    {
        return $project->hasPermissionOrTier($user, Permission::LABELS_UPDATE, [RoleType::OWNER, RoleType::ADMIN]);
    }

    public function deleteLabels(User $user, Project $project): bool
    {
        return $project->hasPermissionOrTier($user, Permission::LABELS_DELETE, [RoleType::OWNER, RoleType::ADMIN]);
    }

    public function viewIssueTypes(User $user, Project $project): bool
    {
        return $project->hasPermissionOrTier($user, Permission::ISSUE_TYPES_VIEW, [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER, RoleType::VIEWER]);
    }

    public function createIssueTypes(User $user, Project $project): bool
    {
        return $project->hasPermissionOrTier($user, Permission::ISSUE_TYPES_CREATE, [RoleType::OWNER, RoleType::ADMIN]);
    }

    public function updateIssueTypes(User $user, Project $project): bool
    {
        return $project->hasPermissionOrTier($user, Permission::ISSUE_TYPES_UPDATE, [RoleType::OWNER, RoleType::ADMIN]);
    }

    public function deleteIssueTypes(User $user, Project $project): bool
    {
        return $project->hasPermissionOrTier($user, Permission::ISSUE_TYPES_DELETE, [RoleType::OWNER, RoleType::ADMIN]);
    }

    public function updateWorkflow(User $user, Project $project): bool
    {
        return $project->hasPermissionOrTier($user, Permission::WORKFLOW_UPDATE, [RoleType::OWNER, RoleType::ADMIN]);
    }
}
