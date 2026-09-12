# Extend required fields

An issue type's `required_fields` is a fixed set of keys, each mapped
to the actual `Issue` create/update request field it enforces
non-emptiness on. Worked example: adding a `parent` option, so a
project can mark a type (say, a `Sub-task`-shaped custom type) as
"must always be created as a sub-issue of something."

## Step 1 — Add the mapping

File: `app/Services/IssueTypeService.php`

```php
/**
 * The fixed set of issue fields that an issue type can mark as required,
 * mapped to the request/data key each one corresponds to on Issue
 * create/update.
 */
public const array REQUIRED_FIELD_TO_DATA_KEY = [
    'description' => 'description',
    'assignee' => 'assignee_id',
    'labels' => 'labels',
    'start_date' => 'start_date',
    'end_date' => 'end_date',
    'priority' => 'priority',
    'parent' => 'parent_id',
];
```

`assertRequiredFieldsSatisfied()` (same file) already does the actual
enforcement generically off this map — nothing else in that method
needs to change:

```php
public function assertRequiredFieldsSatisfied(IssueType $issueType, array $data, bool $isCreate): void
{
    $missingDataKeys = [];

    foreach ($issueType->required_fields ?? [] as $field) {
        $dataKey = self::REQUIRED_FIELD_TO_DATA_KEY[$field] ?? null;

        if (! $dataKey) {
            continue;
        }

        if ($isCreate) {
            if ($this->isEmptyValue($data[$dataKey] ?? null)) {
                $missingDataKeys[$dataKey] = true;
            }
        } elseif (array_key_exists($dataKey, $data) && $this->isEmptyValue($data[$dataKey])) {
            $missingDataKeys[$dataKey] = true;
        }
    }

    if ($missingDataKeys) {
        throw ValidationException::withMessages(array_fill_keys(
            array_keys($missingDataKeys),
            'This field is required for the selected issue type.',
        ));
    }
}
```

`IssueController::store`/`update` already call this method (after
resolving the issue's type and merging in `parent_id`/`issue_type_id`
changes), and it's already wired into the request lifecycle — see
`app/Http/Controllers/IssueController.php`'s `store()` method, which
calls `$this->issueTypeService->assertRequiredFieldsSatisfied($issueType, $data, isCreate: true);`
right before `$this->issueService->createIssue($data)`. Because
`parent_id` is already a real field on the create/update request (see
[`../architecture/02-backend-layered-architecture.md`](../architecture/02-backend-layered-architecture.md)
for the general request-validation shape), no controller change is
needed here at all — the new map entry is enough.

## Step 2 — Allow it through the settings validation

File: `app/Http/Controllers/IssueTypeController.php`

Both `store()` and `update()` validate `required_fields.*` against
`Rule::in(array_keys(IssueTypeService::REQUIRED_FIELD_TO_DATA_KEY))` —
since that reads the map's keys directly, adding `'parent'` to the map
in Step 1 is enough for the settings endpoints to accept it too. No
change needed here, but it's worth knowing this is *why* Step 1 alone
is sufficient:

```php
$validated = $request->validate([
    'name' => ['required', 'string', 'max:50'],
    'icon' => ['required', 'string', 'max:50'],
    'color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
    'description' => ['nullable', 'string', 'max:255'],
    'allows_children' => ['sometimes', 'boolean'],
    'required_fields' => ['sometimes', 'array'],
    'required_fields.*' => ['string', Rule::in(array_keys(IssueTypeService::REQUIRED_FIELD_TO_DATA_KEY))],
    'restricted_role_types' => ['sometimes', 'array'],
    'restricted_role_types.*' => ['string', Rule::in(array_map(fn (RoleType $role) => $role->value, [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER, RoleType::VIEWER]))],
]);
```

## Step 3 — Add the checkbox client-side

File: `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIssueTypeInlineEditor.tsx`

```tsx
const REQUIRED_FIELD_OPTIONS: { value: string; label: string }[] = [
    { value: 'description', label: 'Description' },
    { value: 'assignee', label: 'Assignee' },
    { value: 'labels', label: 'Labels' },
    { value: 'start_date', label: 'Start date' },
    { value: 'end_date', label: 'End date' },
    { value: 'priority', label: 'Priority' },
    { value: 'parent', label: 'Parent issue' },
];
```

This array drives the checkbox grid under "Required fields" in the
inline editor directly — nothing else in that component reads a fixed
list of field names, so this is the only frontend change needed.

## Step 4 — Tests

File: `tests/Feature/IssueTypeWorkflowIntegrationTest.php`

Mirror the existing `'creating an issue of a type with required fields
rejects a request missing one'` test:

```php
test('creating an issue of a type requiring a parent rejects a request without one', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $this->actingAs($member)->post('/issues', ['title' => 'seed', 'project_id' => $project->id, 'priority' => 'low', 'status' => 'open']);
    $subtaskType = $project->issueTypes()->create(['name' => 'Sub-task', 'icon' => 'Bug', 'color' => '#000000', 'required_fields' => ['parent']]);

    $response = $this->actingAs($member)->post('/issues', [
        'title' => 'Orphaned sub-task',
        'project_id' => $project->id,
        'priority' => 'low',
        'status' => 'open',
        'issue_type_id' => $subtaskType->id,
    ]);

    $response->assertSessionHasErrors('parent_id');
});
```

File: `tests/Feature/IssueTypeControllerTest.php`

Add `'parent'` to the existing
`'an admin can set required fields and restricted role types on an
issue type'` test's asserted array so the settings endpoint round-trip
is covered too.

Run `php artisan test --filter=IssueTypeWorkflowIntegrationTest` and
`php artisan test --filter=IssueTypeControllerTest`, plus
`npx vitest run resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIssueTypeInlineEditor.test.tsx`,
before committing.
