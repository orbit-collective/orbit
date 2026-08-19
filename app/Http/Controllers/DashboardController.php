<?php

namespace App\Http\Controllers;

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

    public function __construct(IssueService $issueService, ProjectService $projectService, UserService $userService) {
        $this->issueService = $issueService;
        $this->projectService = $projectService;
        $this->userService = $userService;
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
            'users' => $this->userService->getAssignableUsers(),
        ]);
    }
}
