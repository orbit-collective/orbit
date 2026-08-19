<?php

namespace App\Http\Controllers;

use App\Services\IssueService;
use App\Services\ProjectService;
use App\Services\UserService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    protected IssueService $issueService;
    protected ProjectService $projectService;
    protected UserService $userService;

    public function __construct(IssueService $issueService, ProjectService $projectService, UserService $userService) {
        $this->issueService = $issueService;
        $this->projectService = $projectService;
        $this->userService = $userService;
    }

    /**
     * Display the dashboard.
     */
    public function index(): Response
    {
        $issues = $this->issueService->getAll();
        $projects = $this->projectService->getAll();
        $productivity_trend = $this->issueService->getProductivityTrend();

        return Inertia::render('Dashboard', [
            'issues' => $issues,
            'projects' => $projects,
            'productivity_trend' => $productivity_trend,
            'users' => $this->userService->getAssignableUsers(),
        ]);
    }
}
