<?php

namespace App\Broadcasting;

use App\Enums\Permissions\Permission;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use App\Services\DeveloperPortal\DeveloperPortalAccessService;

/**
 * Names and authorisation of the private channels live updates travel on.
 *
 * One per user (their notifications), one per project (everything that
 * happens in it) and the single Developer Portal channel, open only to users
 * who may open the portal. Channels never carry data a user could not
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

    /** Private channel of the Developer Portal (instance-wide, local development only). */
    public const string DEVELOPER_PORTAL = 'developer-portal';

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

    public static function canJoinDeveloperPortal(User $user): bool
    {
        return app(DeveloperPortalAccessService::class)->canAccess($user);
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
