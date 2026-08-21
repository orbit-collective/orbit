<?php

namespace App\Policies;

use App\Enums\Permissions\Permission;
use App\Enums\Permissions\RoleType;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;

class IssuePolicy
{
    public function view(User $user, Issue $issue): bool
    {
        return $issue->project->users()->where('users.id', $user->id)->exists();
    }

    public function create(User $user, Project $project): bool
    {
        return $this->canModify($user, $project, Permission::ISSUES_CREATE);
    }

    public function update(User $user, Issue $issue): bool
    {
        return $this->canModify($user, $issue->project, Permission::ISSUES_UPDATE);
    }

    public function delete(User $user, Issue $issue): bool
    {
        return $this->canModify($user, $issue->project, Permission::ISSUES_DELETE);
    }

    /**
     * Owner/Admin/Member keep working regardless of whether their system role has
     * been synced yet — only the read-only Viewer tier (and anyone else lacking the
     * permission) is turned away here, falling back to the granular permission.
     */
    private function canModify(User $user, Project $project, Permission $permission): bool
    {
        $role = $project->users()->where('users.id', $user->id)->first()?->pivot->role;

        if (in_array($role, [RoleType::OWNER->value, RoleType::ADMIN->value, RoleType::MEMBER->value], true)) {
            return true;
        }

        return $project->hasPermission($user, $permission);
    }
}
