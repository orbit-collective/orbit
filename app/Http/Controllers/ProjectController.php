<?php

namespace App\Http\Controllers;

use App\Models\Label;
use App\Models\Project;
use App\Models\Role;
use App\Services\ActivityLogService;
use App\Services\IssueService;
use App\Services\IssueTypeService;
use App\Services\LabelService;
use App\Services\PriorityService;
use App\Services\ProjectService;
use App\Services\RoleService;
use App\Services\UserService;
use Carbon\Carbon;
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
    /** A month grid is 42 days; the cap leaves room for week and month views alike. */
    private const int CALENDAR_DEFAULT_SPAN_DAYS = 45;

    private const int CALENDAR_MAX_SPAN_DAYS = 93;

    protected ProjectService $projectService;

    protected IssueService $issueService;

    protected UserService $userService;

    protected ActivityLogService $activityLogService;

    protected LabelService $labelService;

    protected RoleService $roleService;

    protected IssueTypeService $issueTypeService;

    protected PriorityService $priorityService;

    public function __construct(ProjectService $projectService, IssueService $issueService, UserService $userService, ActivityLogService $activityLogService, LabelService $labelService, RoleService $roleService, IssueTypeService $issueTypeService, PriorityService $priorityService)
    {
        $this->projectService = $projectService;
        $this->issueService = $issueService;
        $this->userService = $userService;
        $this->activityLogService = $activityLogService;
        $this->labelService = $labelService;
        $this->roleService = $roleService;
        $this->issueTypeService = $issueTypeService;
        $this->priorityService = $priorityService;
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
            'workflow_status' => array_filter(explode(',', $request->query('workflow_status', ''))),
            'priority' => array_filter(explode(',', $request->query('priority', ''))),
            'assignee' => request()->query('assignee'),
        ];

        [$calendarFrom, $calendarTo] = $this->calendarRange($request);

        // Closures and optional props are only evaluated when the response
        // actually includes them: the calendar's month navigation reloads just
        // its own props, and the calendar data is never sent to the table,
        // board or activity views at all.
        return Inertia::render('Projects/Show', [
            'project' => $project,
            'projects' => $projects,
            'issues' => fn () => $this->issueService->getAllByProjectID($project->id, $sortParams, $perPage, $searchParams, $filters),
            'calendarIssues' => Inertia::optional(fn () => $this->issueService->getCalendarIssues($project->id, $calendarFrom, $calendarTo, $searchParams, $filters)),
            'upcomingDeadlines' => Inertia::optional(fn () => $this->issueService->getUpcomingDeadlines($project->id, $searchParams, $filters)),
            'queryParams' => request()->query() ?: null,
            'filters' => $filters,
            'savedFilters' => $project->savedFilters()->latest()->get(),
            'users' => $this->userService->getAssignableUsersForProject($project->id),
            'activityLogs' => fn () => $this->activityLogService->paginateForProject($project->id, $request->integer(ActivityLogService::PER_PAGE_NAME, 20))->through(fn ($entry) => [
                'id' => $entry->id,
                'body' => $entry->body,
                'userId' => $entry->user_id,
                'userName' => $entry->user?->name,
                'userAvatar' => $entry->user?->avatar,
                'createdAt' => $entry->created_at->toJSON(),
            ]),
            'labels' => $this->mapLabels($this->labelService->getLabels($project)),
            'priorities' => $this->priorityService->getPriorities($project)->map->toOption()->values(),
            'roles' => $this->mapRoleNames($this->roleService->getRoles($project)),
            'issueTypes' => $this->issueTypeService->getIssueTypes($project),
            'nextIssueId' => $this->issueService->peekNextIssueId($project),
        ]);
    }

    /**
     * The date range the calendar asked for (`calendar_from`/`calendar_to`,
     * Y-m-d), defaulting to the current month's grid and capped so a crafted
     * request cannot ask for every issue in one go.
     *
     * @return array{0: string, 1: string}
     */
    private function calendarRange(Request $request): array
    {
        $valid = $request->validate([
            'calendar_from' => 'sometimes|date_format:Y-m-d',
            'calendar_to' => 'sometimes|date_format:Y-m-d',
        ]);

        $from = isset($valid['calendar_from'])
            ? Carbon::parse($valid['calendar_from'])
            : now()->startOfMonth()->subDays(7);
        $to = isset($valid['calendar_to'])
            ? Carbon::parse($valid['calendar_to'])
            : $from->copy()->addDays(self::CALENDAR_DEFAULT_SPAN_DAYS);

        if ($to->lt($from)) {
            $to = $from->copy();
        }

        if ($from->diffInDays($to) > self::CALENDAR_MAX_SPAN_DAYS) {
            $to = $from->copy()->addDays(self::CALENDAR_MAX_SPAN_DAYS);
        }

        return [$from->toDateString(), $to->toDateString()];
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
        $projects = $this->projectService->withIssueCounts($this->projectService->getAllForUser($request->user()->id));

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
            'columns.type' => 'sometimes|boolean',
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
