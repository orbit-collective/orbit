<?php

namespace App\Broadcasting;

use App\Enums\Permissions\Permission;
use App\Models\Project;
use App\Models\User;

/**
 * Names and authorisation of the private channels live updates travel on.
 *
 * Two kinds only: one per user (their notifications) and one per project
 * (everything that happens in it). Channels never carry data a user could not
 * read anyway - events are ids and hints, the page re-fetches through the
 * normal, authorised Inertia routes - so a stale subscription (a member
 * removed while connected) cannot leak anything.
 */
final class LiveChannels
{
    public static function user(int $userId): string
    {
        return "user.$userId";
    }

    public static function project(int $projectId): string
    {
        return "project.$projectId";
    }

    public static function canJoinUser(User $user, int $userId): bool
    {
        return $user->id === $userId;
    }

    public static function canJoinProject(User $user, int $projectId): bool
    {
        $project = Project::query()->find($projectId);

        return $project !== null && $project->hasPermission($user, Permission::PROJECT_VIEW);
    }
}
