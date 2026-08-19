<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\IssueService;
use App\Services\ProjectService;
use App\Services\UserService;
use Illuminate\Container\EntryNotFoundException;
use Illuminate\Contracts\Container\CircularDependencyException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;

class ProjectController extends Controller
{
    protected ProjectService $projectService;
    protected IssueService $issueService;
    protected UserService $userService;

    public function __construct(ProjectService $projectService, IssueService $issueService, UserService $userService) {
        $this->projectService = $projectService;
        $this->issueService = $issueService;
        $this->userService = $userService;
    }

    /**
     * @throws CircularDependencyException
     * @throws EntryNotFoundException
     * @throws NotFoundExceptionInterface
     * @throws ContainerExceptionInterface
     */
    public function show(Request $request, Project $project): Response
    {
        $projects = $this->projectService->getAll();

        $sortParams = request()->only(['sort', 'direction']);
        $perPage = (int) request()->get('perPage', 10);
        $searchParams = request()->only(['search']);
        $filters = [
            'labels' => array_filter(explode(',', $request->query('labels', ''))),
            'status' => array_filter(explode(',', $request->query('status', ''))),
            'priority' => array_filter(explode(',', $request->query('priority', ''))),
            'assignee' => request()->query('assignee'),
        ];

        $issues = $this->issueService->getAllByProjectID($project->id, $sortParams, $perPage, $searchParams, $filters);


        return Inertia::render('Projects/Show', [
            'project' => $project,
            'projects' => $projects,
            'issues' => $issues,
            'queryParams' => request()->query() ?: null,
            'filters' => $filters,
            'savedFilters' => $project->savedFilters()->latest()->get(),
            'users' => $this->userService->getAssignableUsers(),
        ]);
    }

    public function index(): Response
    {
        $projects = Project::with('issues')->latest()->get();

        return Inertia::render('Projects/Index', [
            'projects' => $projects,
        ]);
    }
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:30',
            'description' => 'nullable|string',
            'slug' => 'required|string|max:30',
            'color' => 'required|string'
        ]);

        $project = $this->projectService->createProject($data);

        return redirect()->back()
            ->with('success', 'Project has been created successfully.')
            ->with('action_url', route('projects.show', $project->id));
    }
    public function updateColumns(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'columns' => 'required|array',
            'columns.id' => 'sometimes|boolean',
            'columns.title' => 'sometimes|boolean',
            'columns.status' => 'sometimes|boolean',
            'columns.assignee' => 'sometimes|boolean',
            'columns.priority' => 'sometimes|boolean',
            'columns.labels' => 'sometimes|boolean',
            'columns.updated' => 'sometimes|boolean',
            'columns.start_date' => 'sometimes|boolean',
            'columns.end_date' => 'sometimes|boolean',
        ]);

        $this->projectService->updateColumns($project, $validated['columns']);

        return redirect()->back()->with('success', 'Columns configuration updated successfully.');
    }
}
