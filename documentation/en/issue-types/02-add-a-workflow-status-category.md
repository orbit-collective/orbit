# Add a workflow status category

A workflow status's `category` isn't free text — it's a fixed,
three-value enum (`todo`/`in_progress`/`done`) shared by every issue
type's workflow, used to color-group statuses and as the coarse bucket the board
columns, the status filter, the dashboard counters and the
change-status automation work on. Worked
example: adding a fourth bucket, `blocked`, for a status like "Blocked"
or "On Hold" that isn't really "in progress" but isn't abandoned
either.

If you just want to add another **status** to one issue type's
workflow — using the existing three categories — don't touch any code,
use **Settings → Issue Types → Manage workflow** in the app itself.
This guide is for adding a new category value itself.

## Step 1 — Extend the backend enum

File: `app/Enums/WorkflowStatusCategory.php`

```php
<?php

namespace App\Enums;

enum WorkflowStatusCategory: string
{
    case TODO = 'todo';
    case IN_PROGRESS = 'in_progress';
    case DONE = 'done';
    case BLOCKED = 'blocked';
}
```

This is the only backend type-level change needed:
`App\Models\WorkflowStatus` casts its `category` column to this enum
already (`protected $casts = ['category' => WorkflowStatusCategory::class]`
in `app/Models/WorkflowStatus.php`), and `App\Http\Controllers\WorkflowController`
validates an incoming `category` with `Rule::enum(WorkflowStatusCategory::class)`
(both `storeStatus()` and `updateStatus()`) — a new case is accepted by
that rule automatically, no controller change required.

## Step 2 — Decide where the new category has to be handled

The issue's status is its workflow status alone (the old
`issues.status` open/in_progress/closed column is gone), so nothing maps
a legacy value onto a category any more. What does read the category:

- `IssueTypeService::statusForCategory()` — returns the type's first
  status of a category; used by the importer (a mapping may name a
  category) and works for a new case without changes.
- `ChangeStatusAction` — accepts a `category` param validated against
  `WorkflowStatusCategory::tryFrom()`, so a new case is accepted as is.
- `IssueRepository::applySearchAndFilters()` and the `status` sort —
  the filter takes category values and the sort ranks them with a
  `CASE`; add `'blocked'` to that `CASE` in `getAllPaginated()` so it
  sorts where you want it.

A `blocked` status is something a user sets explicitly via
`workflow_status_id`; the board's status columns
(`STATUS_COLUMNS` in `IssueBoard.tsx`) only list the three original
categories, so decide whether the new one gets a column of its own.

## Step 3 — Add it to the frontend option list

File: `resources/js/types/Workflow.ts`

```ts
export type WorkflowStatusCategory = 'todo' | 'in_progress' | 'done' | 'blocked';
```

File: `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsWorkflowModal.tsx`

```tsx
const CATEGORY_OPTIONS: { value: WorkflowStatusCategory; label: string }[] = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
    { value: 'blocked', label: 'Blocked' },
];
```

That's every frontend reference — `CATEGORY_OPTIONS` drives both the
"add status" form's category `<select>` and the label shown next to
each existing status in the modal. `WorkflowStatusBadge` and
`IssueElement`'s `isClosed` check
(`issue.workflowStatus.category === 'done'`) only ever compare against
`'done'` specifically, so a new category needs no change there.

## Step 4 — Tests

File: `tests/Feature/Models/WorkflowStatusTest.php`

Add a case asserting the new enum value round-trips through the cast,
mirroring the existing category assertions in that file:

```php
test('a workflow status can be created with the blocked category', function () {
    $status = WorkflowStatus::factory()->create(['category' => WorkflowStatusCategory::BLOCKED]);

    expect($status->category)->toBe(WorkflowStatusCategory::BLOCKED);
});
```

File: `tests/Feature/WorkflowControllerTest.php`

Add a case confirming the controller accepts it end to end, mirroring
`'an admin can add a status to an issue type workflow'`:

```php
test('an admin can add a status with the blocked category', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    addProjectMember($project, $admin->id, 'admin');
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);

    $response = $this->actingAs($admin)->post("/projects/$project->id/issue-types/$issueType->id/statuses", [
        'name' => 'Blocked',
        'color' => '#ef4444',
        'category' => 'blocked',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('workflow_statuses', ['issue_type_id' => $issueType->id, 'name' => 'Blocked', 'category' => 'blocked']);
});
```

Run `php artisan test --filter=WorkflowStatusTest` and
`php artisan test --filter=WorkflowControllerTest`, plus
`npx vitest run resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsWorkflowModal.test.tsx`,
before committing.
