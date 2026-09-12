<?php

namespace App\Http\Controllers;

use App\Models\Label;
use App\Models\Project;
use App\Models\Role;
use App\Services\ActivityLogService;
use App\Services\IssueService;
use App\Services\LabelService;
use App\Services\ProjectService;
use App\Services\RoleService;
use App\Services\UserService;
use Illuminate\Container\EntryNotFoundException;
use Illuminate\Contracts\Container\CircularDependencyException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;

class ProjectController extends Controller
{
    protected ProjectService $projectService;

    protected IssueService $issueService;

    protected UserService $userService;

    protected ActivityLogService $activityLogService;

    protected LabelService $labelService;

    protected RoleService $roleService;

    public function __construct(ProjectService $projectService, IssueService $issueService, UserService $userService, ActivityLogService $activityLogService, LabelService $labelService, RoleService $roleService)
    {
        $this->projectService = $projectService;
        $this->issueService = $issueService;
        $this->userService = $userService;
        $this->activityLogService = $activityLogService;
        $this->labelService = $labelService;
        $this->roleService = $roleService;
    }

    /**
     * @throws CircularDependencyException
     * @throws EntryNotFoundException
     * @throws NotFoundExceptionInterface
     * @throws ContainerExceptionInterface
     */
    public function show(Request $request, Project $project): Response
    {
        $this->authorize('view', $project);

        $projects = $this->projectService->getAllForUser($request->user()->id);

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
        $calendarIssues = $this->issueService->getAllForProject($project->id, $searchParams, $filters);

        return Inertia::render('Projects/Show', [
            'project' => $project,
            'projects' => $projects,
            'issues' => $issues,
            'calendarIssues' => $calendarIssues,
            'queryParams' => request()->query() ?: null,
            'filters' => $filters,
            'savedFilters' => $project->savedFilters()->latest()->get(),
            'users' => $this->userService->getAssignableUsersForProject($project->id),
            'activityLogs' => $this->activityLogService->getRecentForProject($project->id, 50)->map(fn ($entry) => [
                'id' => $entry->id,
                'body' => $entry->body,
                'userId' => $entry->user_id,
                'userName' => $entry->user?->name,
                'userAvatar' => $entry->user?->avatar,
                'createdAt' => $entry->created_at->toJSON(),
            ]),
            'labels' => $this->mapLabels($this->labelService->getLabels($project)),
            'roles' => $this->mapRoleNames($this->roleService->getRoles($project)),
        ]);
    }

    private function mapLabels(Collection $labels): array
    {
        return $labels->map(fn (Label $label) => [
            'id' => $label->id,
            'name' => $label->name,
            'color' => $label->color,
            'description' => $label->description,
            'isSystem' => $label->is_system,
        ])->values()->all();
    }

    /**
     * Just enough of a role to look its tier up by name in the activity log
     * (see resources/js/utils/activityLogRichText.tsx's RoleValue) - not the
     * full shape SettingsController::mapRoles() builds for the Roles &
     * management tab itself.
     */
    private function mapRoleNames(Collection $roles): array
    {
        return $roles->map(fn (Role $role) => [
            'name' => $role->name,
            'type' => $role->role,
        ])->values()->all();
    }

    public function index(Request $request): Response
    {
        $projects = $this->projectService->getAllForUser($request->user()->id)->load('issues');

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
            'color' => 'required|string',
        ]);

        $project = $this->projectService->createProject($data, $request->user()->id);

        return redirect()->back()
            ->with('success', 'Project has been created successfully.')
            ->with('action_url', route('projects.show', $project->id));
    }

    public function updateColumns(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

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

    public function updateDetails(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('updateDetails', $project);

        $validated = $request->validate([
            'name' => 'required|string|max:30',
            'description' => 'nullable|string',
            'color' => 'required|string',
        ]);

        $this->projectService->updateDetails($project, $validated);

        return redirect()->back()->with('success', 'Project details updated successfully.');
    }

    public function destroy(Project $project): RedirectResponse
    {
        $this->authorize('delete', $project);

        $this->projectService->deleteProject($project);

        return redirect()->route('projects.index')->with('success', "\"$project->name\" has been deleted.");
    }
}
