<?php

namespace App\Policies;

use App\Enums\Permissions\Permission;
use App\Enums\Permissions\RoleType;
use App\Models\Comment;
use App\Models\Issue;
use App\Models\User;

class CommentPolicy
{
    public function create(User $user, Issue $issue): bool
    {
        $project = $issue->project;
        $role = $project->users()->where('users.id', $user->id)->first()?->pivot->role;

        if (in_array($role, [RoleType::OWNER->value, RoleType::ADMIN->value, RoleType::MEMBER->value], true)) {
            return true;
        }

        return $project->hasPermission($user, Permission::COMMENTS_CREATE);
    }

    public function delete(User $user, Comment $comment): bool
    {
        if ($comment->user_id === $user->id) {
            return true;
        }

        $project = $comment->issue->project;
        $role = $project->users()->where('users.id', $user->id)->first()?->pivot->role;

        if (in_array($role, [RoleType::OWNER->value, RoleType::ADMIN->value], true)) {
            return true;
        }

        return $project->hasPermission($user, Permission::COMMENTS_DELETE_ANY);
    }
}
