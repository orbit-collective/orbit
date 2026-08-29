# Surface the activity log in the UI

`ActivityLogRepository::getRecentForProject()` already exists and
already does the right query (`latest()->limit(15)`, eager-loading
`user`) — it's just never called. This guide wires it all the way
through to a real "Recent activity" panel on the project page.

## Step 1 — Expose the read method on the Service

File: `app/Services/ActivityLogService.php`

```php
<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Repositories\ActivityLogRepository;
use Illuminate\Support\Collection;

class ActivityLogService
{
    public function __construct(
        protected ActivityLogRepository $activityLogRepository
    ) {}

    public function log(?int $projectId, string $body, ?int $userId = null): ActivityLog
    {
        return ActivityLog::query()->create([
            'project_id' => $projectId,
            'user_id' => $userId ?? auth()->id(),
            'body' => $body,
        ]);
    }

    public function getRecentForProject(int $projectId): Collection
    {
        return $this->activityLogRepository->getRecentForProject($projectId);
    }
}
```

`ActivityLogService::log()` currently builds the `ActivityLog` model
directly rather than going through `ActivityLogRepository` at all —
that's an existing inconsistency with the
[Controller → Service → Repository](../architecture/02-backend-layered-architecture.md)
rule ("every Eloquent query lives in the Repository"), pre-dating this
guide; `getRecentForProject()` above is written the *correct* way
(delegating to the Repository) so as not to compound the
inconsistency further — don't copy `log()`'s direct-model-access shape
for new methods.

## Step 2 — Thread it into the project page

File: `app/Http/Controllers/ProjectController.php`

```php
public function __construct(
    ProjectService $projectService,
    IssueService $issueService,
    UserService $userService,
    ActivityLogService $activityLogService
) {
    $this->projectService = $projectService;
    $this->issueService = $issueService;
    $this->userService = $userService;
    $this->activityLogService = $activityLogService;
}
```

```php
return Inertia::render('Projects/Show', [
    'project' => $project,
    'projects' => $projects,
    'issues' => $issues,
    'queryParams' => request()->query() ?: null,
    'filters' => $filters,
    'savedFilters' => $project->savedFilters()->latest()->get(),
    'users' => $this->userService->getAssignableUsersForProject($project->id),
    'recentActivity' => $this->activityLogService->getRecentForProject($project->id)
        ->map(fn ($entry) => [
            'id' => $entry->id,
            'body' => $entry->body,
            'userName' => $entry->user?->name,
            'createdAt' => $entry->created_at,
        ]),
]);
```

Map to a plain array rather than passing the Eloquent collection
straight through — the same convention every other prop-mapping
method in this codebase follows (see `SettingsController`'s
`mapMembers()`/`mapInvitations()`/`mapRoles()` for the established
shape), so the frontend only ever depends on a stable, intentional
shape rather than every column the model happens to have.

## Step 3 — Render it

New type, file: `resources/js/types/ActivityLog.ts`

```ts
export interface ActivityLogEntry {
    id: number;
    body: string;
    userName: string | null;
    createdAt: string;
}
```

New component, file:
`resources/js/Components/Molecules/ActivityFeed/ActivityFeed.tsx`

```tsx
import { ActivityLogEntry } from '@/types/ActivityLog';
import { formatTimeAgo } from '@/utils/time';

interface ActivityFeedProps {
    entries: ActivityLogEntry[];
}

export default function ActivityFeed({ entries }: ActivityFeedProps) {
    if (entries.length === 0) {
        return (
            <p className="py-6 text-center text-xs text-[var(--text-muted-color)]">
                No activity yet.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            {entries.map((entry) => (
                <div key={entry.id} className="text-sm">
                    <span className="text-[var(--text-color)]">
                        {entry.userName ?? 'Someone'}
                    </span>{' '}
                    <span className="text-[var(--text-gray-color)]">
                        {entry.body}
                    </span>
                    <p className="text-xs text-[var(--text-muted-color)]">
                        {formatTimeAgo(entry.createdAt)} ago
                    </p>
                </div>
            ))}
        </div>
    );
}
```

Then render `<ActivityFeed entries={recentActivity} />` from wherever
`Pages/Projects/Show.tsx` makes sense to add it (a sidebar panel next
to the issue list is the natural spot, mirroring how
[the notification bell popup](../notifications/03-frontend-backend-wiring-overview.md)
is a self-contained list-of-items component of its own).

## Tests

- `tests/Feature/ActivityLogServiceTest.php` (new file — none exists
  today) — a test for `getRecentForProject()` asserting it returns
  entries for the right project only, ordered newest-first, capped at
  15.
- `tests/Feature/ProjectControllerTest.php` — add a test asserting
  `show()`'s Inertia response includes a `recentActivity` prop shaped
  correctly.
- `resources/js/Components/Molecules/ActivityFeed/ActivityFeed.test.tsx`
  (new file) — render with entries, assert each renders; render with
  an empty array, assert the "No activity yet." empty state.
