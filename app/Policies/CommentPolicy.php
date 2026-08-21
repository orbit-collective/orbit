<?php

namespace App\Policies;

use App\Enums\Permissions\Permission;
use App\Enums\Permissions\RoleType;
use App\Models\Comment;
use App\Models\Issue;
use App\Models\User;

class CommentPolicy
{
    private const array OWN_TIERS = [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER];

    private const array ANY_TIERS = [RoleType::OWNER, RoleType::ADMIN];

    public function create(User $user, Issue $issue): bool
    {
        return $issue->project->hasPermissionOrTier($user, Permission::COMMENTS_CREATE, self::OWN_TIERS);
    }

    public function update(User $user, Comment $comment): bool
    {
        $project = $comment->issue->project;

        if ($comment->user_id === $user->id) {
            return $project->hasPermissionOrTier($user, Permission::COMMENTS_UPDATE_OWN, self::OWN_TIERS);
        }

        return $project->hasPermissionOrTier($user, Permission::COMMENTS_UPDATE_ANY, self::ANY_TIERS);
    }

    public function delete(User $user, Comment $comment): bool
    {
        $project = $comment->issue->project;

        if ($comment->user_id === $user->id) {
            return $project->hasPermissionOrTier($user, Permission::COMMENTS_DELETE_OWN, self::OWN_TIERS);
        }

        return $project->hasPermissionOrTier($user, Permission::COMMENTS_DELETE_ANY, self::ANY_TIERS);
    }
}
