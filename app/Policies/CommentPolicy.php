<?php

namespace App\Policies;

use App\Enums\Permissions\Permission;
use App\Models\Comment;
use App\Models\Issue;
use App\Models\User;

class CommentPolicy
{
    public function create(User $user, Issue $issue): bool
    {
        return $issue->project->hasPermission($user, Permission::COMMENTS_CREATE);
    }

    public function update(User $user, Comment $comment): bool
    {
        $project = $comment->issue->project;

        if ($comment->user_id === $user->id) {
            return $project->hasPermission($user, Permission::COMMENTS_UPDATE_OWN);
        }

        return $project->hasPermission($user, Permission::COMMENTS_UPDATE_ANY);
    }

    public function delete(User $user, Comment $comment): bool
    {
        $project = $comment->issue->project;

        if ($comment->user_id === $user->id) {
            return $project->hasPermission($user, Permission::COMMENTS_DELETE_OWN);
        }

        return $project->hasPermission($user, Permission::COMMENTS_DELETE_ANY);
    }
}
