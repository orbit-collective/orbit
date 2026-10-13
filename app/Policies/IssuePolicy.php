<?php

namespace App\Policies;

use App\Enums\Permissions\Permission;
use App\Models\Issue;
use App\Models\IssueType;
use App\Models\Project;
use App\Models\User;

class IssuePolicy
{
    public function view(User $user, Issue $issue): bool
    {
        return $issue->project->hasMember($user);
    }

    public function create(User $user, Project $project): bool
    {
        return $project->hasPermission($user, Permission::ISSUES_CREATE);
    }

    /**
     * A second, narrower gate on top of create(): an issue type can restrict
     * who is allowed to use it via restricted_role_types. An empty list
     * means "no restriction" - anyone who passes create() above may use it.
     */
    public function createOfType(User $user, Project $project, IssueType $issueType): bool
    {
        if (empty($issueType->restricted_role_types)) {
            return true;
        }

        $role = $project->roleOf($user);

        return in_array($role, $issueType->restricted_role_types, true);
    }

    public function update(User $user, Issue $issue): bool
    {
        return $issue->project->hasPermission($user, Permission::ISSUES_UPDATE);
    }

    public function delete(User $user, Issue $issue): bool
    {
        return $issue->project->hasPermission($user, Permission::ISSUES_DELETE);
    }

    public function assign(User $user, Issue $issue): bool
    {
        return $issue->project->hasPermission($user, Permission::ISSUES_ASSIGN);
    }

    public function changeStatus(User $user, Issue $issue): bool
    {
        return $issue->project->hasPermission($user, Permission::ISSUES_CHANGE_STATUS);
    }

    public function changePriority(User $user, Issue $issue): bool
    {
        return $issue->project->hasPermission($user, Permission::ISSUES_CHANGE_PRIORITY);
    }

    public function changeLabels(User $user, Issue $issue): bool
    {
        return $issue->project->hasPermission($user, Permission::ISSUES_CHANGE_LABELS);
    }

    /**
     * Creating a branch or pull request from this issue - deliberately a
     * separate ability from update(), since it triggers real GitHub App API
     * calls (via orbit-api) rather than just editing the issue itself.
     */
    public function createGithubDevelopment(User $user, Issue $issue): bool
    {
        return $issue->project->hasPermission($user, Permission::GITHUB_DEVELOPMENT_CREATE);
    }
}
