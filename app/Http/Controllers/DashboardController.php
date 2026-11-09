<?php

namespace App\Http\Controllers;

use App\Enums\Dashboard\DashboardWidgetType;
use App\Services\ActivityLogService;
use App\Services\DashboardLayoutService;
use App\Services\DashboardSavedLayoutService;
use App\Services\IssueService;
use App\Services\IssueTypeService;
use App\Services\ProjectService;
use App\Services\UserService;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    protected IssueService $issueService;

    protected ProjectService $projectService;

    protected UserService $userService;

    protected ActivityLogService $activityLogService;

    protected IssueTypeService $issueTypeService;

    protected DashboardLayoutService $dashboardLayoutService;

    protected DashboardSavedLayoutService $dashboardSavedLayoutService;

    public function __construct(IssueService $issueService, ProjectService $projectService, UserService $userService, ActivityLogService $activityLogService, IssueTypeService $issueTypeService, DashboardLayoutService $dashboardLayoutService, DashboardSavedLayoutService $dashboardSavedLayoutService)
    {
        $this->issueService = $issueService;
        $this->projectService = $projectService;
        $this->userService = $userService;
        $this->activityLogService = $activityLogService;
        $this->issueTypeService = $issueTypeService;
        $this->dashboardLayoutService = $dashboardLayoutService;
        $this->dashboardSavedLayoutService = $dashboardSavedLayoutService;
    }

    /**
     * Display the dashboard.
     */
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;
        $widgets = $this->dashboardLayoutService->widgetsFor($userId);
        $needed = $this->dashboardLayoutService->requiredProps($widgets);

        // What a visible widget reads is sent with the page; the rest only
        // when asked for (the layout editor does that for a widget that was
        // just added), so a hidden widget costs no queries.
        $prop = fn (string $name, Closure $resolve) => in_array($name, $needed, true)
            ? $resolve
            : Inertia::optional($resolve);

        return Inertia::render('Dashboard', [
            'dashboardLayout' => fn () => [
                'widgets' => $widgets,
                'catalog' => DashboardWidgetType::catalog(),
            ],
            'savedLayouts' => fn () => $this->dashboardSavedLayoutService->listFor($userId),
            // Closures, so a live update that re-reads only some of these
            // (see useDashboardLive) does not pay for the rest.
            'issueStats' => $prop('issueStats', fn () => $this->issueService->getStatsForUser($userId)),
            // The sidebar draws the projects, so they are always sent.
            'projects' => fn () => $this->projectService->withIssueCounts($this->projectService->getAllForUser($userId)),
            'myIssues' => $prop('myIssues', fn () => $this->issueService->getMyIssuesForUser($userId)),
            'deadlines' => $prop('deadlines', fn () => $this->issueService->getDeadlinesForUser($userId)),
            'productivity_trend' => $prop('productivity_trend', fn () => $this->issueService->getProductivityTrendForUser($userId)),
            'users' => $prop('users', fn () => $this->userService->getAssignableUsersForUserProjects($userId)),
            'queryParams' => $request->query() ?: null,
            'activityLogs' => $prop('activityLogs', fn () => $this->activityLogService->paginateForUser($userId, $request->integer(ActivityLogService::PER_PAGE_NAME, 10))->through(fn ($entry) => [
                'id' => $entry->id,
                'body' => $entry->body,
                'userId' => $entry->user_id,
                'userName' => $entry->user?->name,
                'userAvatar' => $entry->user?->avatar,
                'createdAt' => $entry->created_at->toJSON(),
            ])),
            'issueTypes' => $prop('issueTypes', fn () => $this->issueTypeService->getIssueTypesForProjects($this->projectService->getAllForUser($userId)->pluck('id')->all())),
        ]);
    }
}
