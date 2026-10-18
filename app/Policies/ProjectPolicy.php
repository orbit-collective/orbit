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
        return $project->hasMember($user);
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

        return array_any($writeGates, fn ($permission) => $project->hasPermission($user, $permission));

    }

    public function updateDetails(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::PROJECT_UPDATE);
    }

    public function delete(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::PROJECT_DELETE);
    }

    public function inviteMembers(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::MEMBERS_INVITE);
    }

    public function updateMemberRole(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::MEMBERS_UPDATE);
    }

    public function removeMember(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::MEMBERS_DELETE);
    }

    public function transferOwnership(User $user, Project $project): bool
    {
        return $project->roleOf($user) === RoleType::OWNER->value;
    }

    public function viewIntegrations(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::INTEGRATIONS_VIEW);
    }

    public function updateIntegrations(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::INTEGRATIONS_UPDATE);
    }

    public function viewAutomation(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::AUTOMATION_VIEW);
    }

    public function updateAutomation(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::AUTOMATION_UPDATE);
    }

    public function viewLabels(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::LABELS_VIEW);
    }

    public function createLabels(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::LABELS_CREATE);
    }

    public function updateLabels(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::LABELS_UPDATE);
    }

    public function deleteLabels(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::LABELS_DELETE);
    }

    public function viewPriorities(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::PRIORITIES_VIEW);
    }

    public function createPriorities(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::PRIORITIES_CREATE);
    }

    public function updatePriorities(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::PRIORITIES_UPDATE);
    }

    public function deletePriorities(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::PRIORITIES_DELETE);
    }

    public function viewIssueTypes(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::ISSUE_TYPES_VIEW);
    }

    public function createIssueTypes(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::ISSUE_TYPES_CREATE);
    }

    public function updateIssueTypes(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::ISSUE_TYPES_UPDATE);
    }

    public function deleteIssueTypes(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::ISSUE_TYPES_DELETE);
    }

    public function updateWorkflow(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::WORKFLOW_UPDATE);
    }
}
