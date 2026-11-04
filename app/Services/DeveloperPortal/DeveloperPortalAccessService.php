<?php

namespace App\Services\DeveloperPortal;

use App\Enums\Permissions\Permission;
use App\Models\User;
use App\Services\ProjectService;

/**
 * Who may open the Developer Portal. Two gates, both required: the portal is
 * enabled at all (APP_ENV=local, see config/developer-portal.php) and the user
 * holds `developer.portal.view`. The portal is instance-wide while permissions
 * belong to projects, so the permission counts when any project the user is a
 * member of grants it (an Owner always passes, like everywhere else).
 */
class DeveloperPortalAccessService
{
    public function __construct(private ProjectService $projectService) {}

    public function enabled(): bool
    {
        return (bool) config('developer-portal.enabled');
    }

    public function canAccess(?User $user): bool
    {
        if ($user === null || ! $this->enabled()) {
            return false;
        }

        return $this->projectService->getAllForUser($user->id)
            ->contains(fn ($project) => $project->hasPermission($user, Permission::DEVELOPER_PORTAL_VIEW));
    }
}
