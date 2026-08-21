<?php

namespace App\Policies;

use App\Enums\Permissions\Permission;
use App\Enums\Permissions\RoleType;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;

class IssuePolicy
{
    private const array MODIFY_TIERS = [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER];

    public function view(User $user, Issue $issue): bool
    {
        return $issue->project->users()->where('users.id', $user->id)->exists();
    }

    public function create(User $user, Project $project): bool
    {
        return $project->hasPermissionOrTier($user, Permission::ISSUES_CREATE, self::MODIFY_TIERS);
    }

    public function update(User $user, Issue $issue): bool
    {
        return $issue->project->hasPermissionOrTier($user, Permission::ISSUES_UPDATE, self::MODIFY_TIERS);
    }

    public function delete(User $user, Issue $issue): bool
    {
        return $issue->project->hasPermissionOrTier($user, Permission::ISSUES_DELETE, self::MODIFY_TIERS);
    }

    public function assign(User $user, Issue $issue): bool
    {
        return $issue->project->hasPermissionOrTier($user, Permission::ISSUES_ASSIGN, self::MODIFY_TIERS);
    }

    public function changeStatus(User $user, Issue $issue): bool
    {
        return $issue->project->hasPermissionOrTier($user, Permission::ISSUES_CHANGE_STATUS, self::MODIFY_TIERS);
    }

    public function changePriority(User $user, Issue $issue): bool
    {
        return $issue->project->hasPermissionOrTier($user, Permission::ISSUES_CHANGE_PRIORITY, self::MODIFY_TIERS);
    }

    public function changeLabels(User $user, Issue $issue): bool
    {
        return $issue->project->hasPermissionOrTier($user, Permission::ISSUES_CHANGE_LABELS, self::MODIFY_TIERS);
    }
}
