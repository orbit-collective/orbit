# Add a workflow status category

A workflow status's `category` isn't free text — it's a fixed,
three-value enum (`todo`/`in_progress`/`done`) shared by every issue
type's workflow, used to color-group statuses and to map the legacy
`issues.status` value onto whichever real status best fits. Worked
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

## Step 2 — Decide what the legacy status mapping does with it

File: `app/Services/IssueTypeService.php`

`resolveWorkflowStatusForLegacyValue()` maps the old `issues.status`
enum (`open`/`in_progress`/`closed`) onto a category:

```php
public function resolveWorkflowStatusForLegacyValue(IssueType $issueType, ?string $legacyStatus): ?WorkflowStatus
{
    $category = match ($legacyStatus) {
        'open' => WorkflowStatusCategory::TODO,
        'in_progress' => WorkflowStatusCategory::IN_PROGRESS,
        'closed' => WorkflowStatusCategory::DONE,
        default => null,
    };

    $status = $category
        ? $issueType->statuses()->where('category', $category->value)->orderBy('sort_order')->first()
        : null;

    return $status
        ?? $issueType->statuses()->where('is_initial', true)->first()
        ?? $issueType->statuses()->orderBy('sort_order')->first();
}
```

There is no fourth legacy `IssueStatus` value to map onto `blocked` —
`open`/`in_progress`/`closed` is a closed, unrelated enum
(`app/Enums/IssueStatus.php`) that predates issue types and is kept in
sync only for backward compatibility. Leave this method as-is: a
`blocked` status is something a user sets explicitly via
`workflow_status_id` (through the real Settings → workflow UI, or the
issue detail view once it's wired to a status picker), not something
the legacy `status` string can ever resolve to. That's expected, not a
gap — don't add a `'blocked' => ...` arm here, there's no legacy value
that means that.

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
    $project->users()->attach($admin->id, ['role' => 'admin']);
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
