# Extract the Service layer

`SavedFilterController` is the one Controller in the app that
constructs and deletes an Eloquent model directly, bypassing the
[Controller → Service → Repository](../architecture/02-backend-layered-architecture.md)
convention every other feature follows. This guide brings it in line
— the same change
[`../activity-log/01-log-a-new-kind-of-activity.md`](../activity-log/01-log-a-new-kind-of-activity.md)
introduces as its own worked example, shown here in full with both
methods.

## Before

File: `app/Http/Controllers/SavedFilterController.php`

```php
class SavedFilterController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'name' => 'required|string|max:20',
            'context' => 'required|string',
            'query_params' => 'required|array',
        ]);

        $this->authorize('view', Project::findOrFail($validated['project_id']));

        SavedFilter::create($validated);
        return redirect()->back()->with('success', 'Saved filters has been created successfully.');
    }

    public function destroy(SavedFilter $savedFilter): RedirectResponse
    {
        $this->authorize('view', $savedFilter->project);

        $savedFilter->delete();
        return redirect()->back()->with('success', 'Saved filters has been deleted successfully.');
    }
}
```

## Step 1 — Add the Repository

New file: `app/Repositories/SavedFilterRepository.php`

```php
<?php

namespace App\Repositories;

use App\Models\SavedFilter;

class SavedFilterRepository
{
    public function create(array $data): SavedFilter
    {
        return SavedFilter::create($data);
    }

    public function delete(SavedFilter $savedFilter): void
    {
        $savedFilter->delete();
    }
}
```

## Step 2 — Add the Service

New file: `app/Services/SavedFilterService.php`

```php
<?php

namespace App\Services;

use App\Models\Project;
use App\Models\SavedFilter;
use App\Repositories\SavedFilterRepository;

class SavedFilterService
{
    public function __construct(
        protected SavedFilterRepository $savedFilterRepository,
        protected ActivityLogService $activityLogService
    ) {}

    public function create(Project $project, array $data): SavedFilter
    {
        $filter = $this->savedFilterRepository->create($data);

        $this->activityLogService->log($project->id, "Saved a new filter: \"{$filter->name}\"");

        return $filter;
    }

    public function delete(SavedFilter $savedFilter): void
    {
        $projectId = $savedFilter->project_id;
        $name = $savedFilter->name;

        $this->savedFilterRepository->delete($savedFilter);

        $this->activityLogService->log($projectId, "Deleted the \"$name\" saved filter");
    }
}
```

Capture `project_id`/`name` into locals **before** calling `delete()`
— once the model is deleted, `$savedFilter`'s attributes are still
readable in PHP (Eloquent doesn't null them out), but reading from a
just-deleted model instance is exactly the kind of thing worth
avoiding on principle; every other `delete*()` method in this codebase
that also logs (see `RoleService::deleteRole()`) logs **before**
calling the repository's delete for the same reason — this method
does it after purely to demonstrate the local-capture alternative, but
matching the established "log-then-delete" order is preferable unless
you have a specific reason not to.

## Step 3 — Update the Controller

File: `app/Http/Controllers/SavedFilterController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\SavedFilter;
use App\Services\SavedFilterService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SavedFilterController extends Controller
{
    public function __construct(
        protected SavedFilterService $savedFilterService
    ) {}

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'name' => 'required|string|max:20',
            'context' => 'required|string',
            'query_params' => 'required|array',
        ]);

        $project = Project::findOrFail($validated['project_id']);
        $this->authorize('view', $project);

        $this->savedFilterService->create($project, $validated);

        return redirect()->back()->with('success', 'Saved filters has been created successfully.');
    }

    public function destroy(SavedFilter $savedFilter): RedirectResponse
    {
        $this->authorize('view', $savedFilter->project);

        $this->savedFilterService->delete($savedFilter);

        return redirect()->back()->with('success', 'Saved filters has been deleted successfully.');
    }
}
```

Validation, authorization, and the redirect/flash responses are
completely unchanged — only the actual create/delete work moves out
of the Controller. No route or frontend change is needed at all; this
refactor is entirely invisible to `useSavedFilters()`.

## Tests

- `tests/Feature/SavedFilterControllerTest.php` — every existing test
  still passes unchanged; it exercises the HTTP layer, which has
  identical behavior before and after.
- New file `tests/Feature/SavedFilterServiceTest.php` — add
  `'it can create a saved filter and logs the change'` and `'it can
  delete a saved filter and logs the change'`, asserting both the
  database state and an `activity_logs` row, mirroring the shape of
  `tests/Feature/RoleServiceTest.php`'s `'it can create a role and
  logs the change'`/`'it can delete a custom role and logs the
  change'` tests.
- New file `tests/Feature/SavedFilterRepositoryTest.php` — thin
  create/delete assertions, mirroring the smallest existing repository
  test file (e.g. `tests/Feature/CommentRepositoryTest.php`) for the
  expected level of coverage.
