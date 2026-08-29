# Log a new kind of activity

There's no enum, no registration step, no frontend map to update —
logging a new kind of activity is a single method call, wherever the
action already happens in a Service.

## The pattern

Every existing call site follows the same shape — write it in the
Service, right after (or as part of) the actual change, with a
human-readable sentence describing what just happened:

```php
// app/Services/ProjectMemberService.php
public function updateRole(Project $project, User $member, RoleType $newRole): void
{
    $this->assertIsMember($project, $member);
    $this->assertNotOwner($project, $member, 'role', "The project owner's role cannot be changed.");

    $this->projectMemberRepository->updateRole($project, $member->id, $newRole);
    $this->roleService->syncSystemRoleForMember($project, $member->id, $newRole);
    $this->activityLogService->log($project->id, "Changed $member->name's role to $newRole->value");
}
```

Worked example: `SavedFilterController::store()` is the one write path
in the app that doesn't log anything — it's also the one Controller
that bypasses the Service layer entirely (see
[`../architecture/02-backend-layered-architecture.md`](../architecture/02-backend-layered-architecture.md)),
creating the `SavedFilter` model directly. Adding a log line here
means introducing the missing Service first, then logging inside it —
the two are naturally the same change:

```php
// app/Http/Controllers/SavedFilterController.php
public function store(Request $request, SavedFilterService $savedFilterService): RedirectResponse
{
    $validated = $request->validate([
        'project_id' => 'required|exists:projects,id',
        'name' => 'required|string|max:20',
        'context' => 'required|string',
        'query_params' => 'required|array',
    ]);

    $project = Project::findOrFail($validated['project_id']);
    $this->authorize('view', $project);

    $savedFilterService->create($project, $validated);

    return redirect()->back()->with('success', 'Saved filters has been created successfully.');
}
```

```php
// app/Services/SavedFilterService.php (new file)
namespace App\Services;

use App\Models\Project;
use App\Models\SavedFilter;

class SavedFilterService
{
    public function __construct(
        protected ActivityLogService $activityLogService
    ) {}

    public function create(Project $project, array $data): SavedFilter
    {
        $filter = SavedFilter::create($data);

        $this->activityLogService->log($project->id, "Saved a new filter: \"{$filter->name}\"");

        return $filter;
    }
}
```

See [`../saved-filters/README.md`](../saved-filters/README.md) for the
rest of what a proper Service extraction for this Controller would
cover beyond just the log line.

## Conventions to follow

- **Inject `ActivityLogService`** into the Service's constructor (it's
  already there in almost every Service — `RoleService`,
  `ProjectMemberService`, `IssueService`, `ProjectInvitationService`,
  `NotificationSettingService`, and more, all take it).
- **Write a complete, past-tense sentence** naming the specific thing
  that changed, including a real name/value where relevant — "Changed
  Jane's role to admin," not "Role updated." The body is the entire
  record; there's no structured data alongside it to reconstruct
  context from later.
- **`$projectId` is `null` for account-level activity** (not tied to
  any project) — see `NotificationSettingService::updateSettings()`'s
  `$this->activityLogService->log(null, 'Updated notification settings', $userId);`
  for the shape.
- **Only pass `$userId` explicitly when the actor isn't the
  authenticated user** — e.g. `ProjectInvitationService::revoke()`
  logs against `auth()->id()` implicitly, while a system-triggered
  action acting on someone else's behalf would need to pass their id
  explicitly. Every existing call site omits it unless there's a
  specific reason not to rely on the default.

## Tests

Whatever test already covers the Service method you added the log
line to — add (or extend) an assertion like:

```php
$this->assertDatabaseHas('activity_logs', [
    'project_id' => $project->id,
    'body' => 'Saved a new filter: "My filter"',
]);
```

mirroring the exact pattern `tests/Feature/ProjectMemberServiceTest.php`'s
`'it can transfer ownership to another member and demotes the
previous owner to admin'` test already uses. Don't add a new,
dedicated `ActivityLogServiceTest` case for this — the log line is
one assertion inside the test for the actual feature, not a feature
of its own. For the `SavedFilterService` example above specifically,
this assertion belongs in a new `tests/Feature/SavedFilterServiceTest.php`
— `tests/Feature/SavedFilterControllerTest.php` already exists and
covers the HTTP layer, but there's no dedicated Service-level test yet
since there's no Service yet either (see
[`../saved-filters/README.md`](../saved-filters/README.md)).
