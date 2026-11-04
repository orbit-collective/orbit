<?php

namespace App\Http\Controllers;

use App\Services\DeveloperPortal\DockerContainerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * JSON endpoints behind the Developer Portal page (the page itself is
 * SettingsController::developerPortal). Every route sits behind the
 * `developer-portal` middleware.
 */
class DeveloperPortalController extends Controller
{
    public function __construct(private DockerContainerService $docker) {}

    /** The tail of one container's log, polled by the open log viewer. */
    public function containerLogs(Request $request, string $container): JsonResponse
    {
        $result = $this->docker->logs(
            $container,
            $request->integer('tail', 200),
        );

        return response()->json($result, $result['found'] ? 200 : 404);
    }
}
