<?php

namespace App\Http\Controllers;

use App\Services\ActivityLogService;
use App\Services\IssueService;
use App\Services\ProjectService;
use App\Services\UserService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    protected IssueService $issueService;
    protected ProjectService $projectService;
    protected UserService $userService;
    protected ActivityLogService $activityLogService;

    public function __construct(IssueService $issueService, ProjectService $projectService, UserService $userService, ActivityLogService $activityLogService) {
        $this->issueService = $issueService;
        $this->projectService = $projectService;
        $this->userService = $userService;
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display the dashboard.
     */
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        $issues = $this->issueService->getAllForUser($userId);
        $projects = $this->projectService->getAllForUser($userId);
        $productivity_trend = $this->issueService->getProductivityTrendForUser($userId);

        return Inertia::render('Dashboard', [
            'issues' => $issues,
            'projects' => $projects,
            'productivity_trend' => $productivity_trend,
            'users' => $this->userService->getAssignableUsersForUserProjects($userId),
            'activityLogs' => $this->activityLogService->getRecentForUser($userId, 15)->map(fn ($entry) => [
                'id' => $entry->id,
                'body' => $entry->body,
                'userName' => $entry->user?->name,
                'createdAt' => $entry->created_at->diffForHumans(),
            ]),
        ]);
    }
}
