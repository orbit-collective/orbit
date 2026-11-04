<?php

namespace App\Broadcasting;

use App\Enums\Permissions\Permission;
use App\Models\Issue;
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
    /**
     * Queue every live event travels on. The queue worker lists it before
     * `default` (`queue:work --queue=live,default`) so a burst of mail or
     * webhook jobs never delays a screen update.
     */
    public const string QUEUE = 'live';

    public static function user(int $userId): string
    {
        return "user.$userId";
    }

    public static function project(int $projectId): string
    {
        return "project.$projectId";
    }

    /** Presence channel: who is looking at one issue right now. */
    public static function issue(int $issueId): string
    {
        return "issue.$issueId";
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

    /**
     * The member card shown to the others on an issue's presence channel, or
     * false when the user may not see the issue. Same fields every project
     * member can already read in the members list.
     *
     * @return array{id: int, name: string, avatar: string|null}|false
     */
    public static function joinIssue(User $user, int $issueId): array|false
    {
        $issue = Issue::query()->select(['id', 'project_id'])->find($issueId);

        if ($issue === null || ! self::canJoinProject($user, $issue->project_id)) {
            return false;
        }

        return ['id' => $user->id, 'name' => $user->name, 'avatar' => $user->avatar];
    }
}
