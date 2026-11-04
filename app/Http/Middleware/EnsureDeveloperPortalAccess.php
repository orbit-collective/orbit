<?php

namespace App\Http\Middleware;

use App\Services\DeveloperPortal\DeveloperPortalAccessService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards every Developer Portal route. A disabled portal (anything but
 * APP_ENV=local) answers 404 so it does not even look like it exists; a user
 * without the permission gets 403.
 */
class EnsureDeveloperPortalAccess
{
    public function __construct(private DeveloperPortalAccessService $access) {}

    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($this->access->enabled(), 404);
        abort_unless($this->access->canAccess($request->user()), 403);

        return $next($request);
    }
}
