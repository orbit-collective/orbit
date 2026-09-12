# Add a new list column

The issues table's toggleable columns are driven by a single registry,
`resources/js/utils/issueTableColumns.ts` — it's the one place that
defines which columns exist, their header label, default width, and
whether they're on by default. Everything else (the header row, the
column-visibility dropdown, each row's default `enabledColumns` prop)
reads from it. What's still bespoke, by design, is each column's
actual cell markup in `ListRow.tsx` — every column renders differently
(a badge, a date, a user avatar, plain text), so that part isn't
genericized. Worked example: adding a `Reporter` column, showing the
issue's creator (`issue.creator`), sortable by that user's name — built
in the exact shape of the existing `Assignee` column.

## Step 1 — Register the column

File: `resources/js/utils/issueTableColumns.ts`

```ts
export const ISSUE_TABLE_COLUMNS: IssueTableColumnDefinition[] = [
    { value: 'id', label: 'ID', defaultWidth: 70, defaultEnabled: true },
    { value: 'title', label: 'Title', defaultWidth: 400, defaultEnabled: true },
    { value: 'type', label: 'Type', defaultWidth: 140, defaultEnabled: true },
    { value: 'status', label: 'Status', defaultWidth: 120, defaultEnabled: true },
    { value: 'assignee', label: 'Assignee', defaultWidth: 140, defaultEnabled: true },
    { value: 'reporter', label: 'Reporter', defaultWidth: 140, defaultEnabled: false },
    { value: 'priority', label: 'Priority', defaultWidth: 140, defaultEnabled: true },
    { value: 'labels', label: 'Labels', defaultWidth: 200, defaultEnabled: true },
    { value: 'updated', label: 'Updated', defaultWidth: 150, defaultEnabled: true },
    { value: 'start_date', label: 'Start', defaultWidth: 150, defaultEnabled: false },
    { value: 'end_date', label: 'End', defaultWidth: 150, defaultEnabled: false },
];
```

This one entry is enough to make `Reporter` show up in `IssueTable`'s
header row (`headers`, derived from this array) and in
`IssueTableHead`'s column-visibility dropdown (`SelectionDropdown`'s
`options`, also derived from this array) — see
`resources/js/Components/Organisms/IssueTable/IssueTable.tsx` and
`resources/js/Components/Organisms/IssueTableHead/IssueTableHead.tsx`,
neither of which needs any further change.

## Step 2 — Add it to the `SortingColumn` union

File: `resources/js/types/Issues.ts`

```ts
export type SortingColumn =
    | 'id'
    | 'title'
    | 'type'
    | 'status'
    | 'assignee'
    | 'reporter'
    | 'priority'
    | 'labels'
    | 'updated'
    | 'start_date'
    | 'end_date';
```

## Step 3 — Render the cell

File: `resources/js/Components/Organisms/ListRow/ListRow.tsx`

Add a cell right after the `assignee` one, following its exact shape:

```tsx
{enabledColumns.assignee && (
    <td
        className={cn(
            cellBase,
            'text-[var(--text-gray-color)]',
        )}
        data-column="assignee"
    >
        <UserBadge
            avatarSrc={issue.assignee?.avatar}
            name={issue.assignee?.name ?? 'Unassigned'}
            size="sm"
        />
    </td>
)}
{enabledColumns.reporter && (
    <td
        className={cn(
            cellBase,
            'text-[var(--text-gray-color)]',
        )}
        data-column="reporter"
    >
        <UserBadge
            avatarSrc={issue.creator?.avatar}
            name={issue.creator?.name ?? 'Unknown'}
            size="sm"
        />
    </td>
)}
```

`issue.creator` is already present on every `Issue` — `IssueRepository`
eager-loads `creator` on every list query already (see Step 4), so no
prop-threading is needed to get the data to this component.

## Step 4 — Make it sortable on the backend

File: `app/Repositories/IssueRepository.php`

Add `'reporter'` to `$allowedColumns` and a `case` in the sort switch,
mirroring the `assignee` case's `leftJoin` pattern exactly (the join
alias avoids a `project_id` ambiguity the same way the `type` column's
join does):

```php
$allowedColumns = ['id', 'title', 'status', 'assignee', 'priority', 'labels', 'updated', 'start_date', 'end_date', 'type', 'reporter'];

if ($column && in_array($column, $allowedColumns)) {
    switch ($column) {
        case 'id':
        case 'title':
        case 'status':
        case 'labels':
            $query->orderBy($column, $direction);
            break;

        case 'priority':
            if ($direction === 'asc') {
                $query->orderByRaw("CASE WHEN priority = 'high' THEN 1 WHEN priority = 'medium' THEN 2 WHEN priority = 'low' THEN 3 ELSE 4 END");
            } else {
                $query->orderByRaw("CASE WHEN priority = 'high' THEN 4 WHEN priority = 'medium' THEN 3 WHEN priority = 'low' THEN 2 ELSE 1 END");
            }
            break;

        case 'assignee':
            $query->leftJoin('users', 'issues.assignee_id', '=', 'users.id')
                ->select('issues.*')
                ->orderBy('users.name', $direction);
            break;

        case 'reporter':
            $query->leftJoin('users as reporters', 'issues.user_id', '=', 'reporters.id')
                ->select('issues.*')
                ->orderBy('reporters.name', $direction);
            break;

        case 'type':
            $query->leftJoin('issue_types', 'issues.issue_type_id', '=', 'issue_types.id')
                ->select('issues.*')
                ->orderBy('issue_types.name', $direction);
            break;

        case 'updated':
            $query->orderBy('updated_at', $direction);
            break;
        case 'start_date':
            $query->orderBy('start_date', $direction);
            break;
        case 'end_date':
            $query->orderBy('end_date', $direction);
            break;
    }
} else {
    $query->latest();
}
```

The join is aliased `reporters` (not `users`) because `assignee`'s own
`leftJoin('users', ...)` already claims that table name in the same
query builder — sorting by both columns in the same request would
otherwise collide. A column that doesn't need sorting can skip this
step entirely; leaving it out of `$allowedColumns` just makes clicking
that header a no-op (falls back to the default `->latest()` order)
instead of an error.

## Step 5 — Allow the column through the visibility-toggle validation

File: `app/Http/Controllers/ProjectController.php`

```php
$validated = $request->validate([
    'columns' => 'required|array',
    'columns.id' => 'sometimes|boolean',
    'columns.title' => 'sometimes|boolean',
    'columns.type' => 'sometimes|boolean',
    'columns.status' => 'sometimes|boolean',
    'columns.assignee' => 'sometimes|boolean',
    'columns.reporter' => 'sometimes|boolean',
    'columns.priority' => 'sometimes|boolean',
    'columns.labels' => 'sometimes|boolean',
    'columns.updated' => 'sometimes|boolean',
    'columns.start_date' => 'sometimes|boolean',
    'columns.end_date' => 'sometimes|boolean',
]);
```

Without this, toggling the column off in the UI still works locally
but the `PATCH /projects/{project}/columns` request silently drops the
unknown key server-side, so it wouldn't persist across a reload.

## Step 6 — Tests

File: `resources/js/Components/Organisms/ListRow/ListRow.test.tsx`

```tsx
test('renders the reporter column when enabled', () => {
    renderRow({
        issue: makeIssue({ creator: { name: 'Jane Doe', avatar: '' } }),
        enabledColumns: { ...DEFAULT_ENABLED_COLUMNS, reporter: true },
    });

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
});
```

(Import `DEFAULT_ENABLED_COLUMNS` from `@/utils/issueTableColumns` at
the top of the file if it isn't already.)

File: `tests/Feature/IssueRepositoryTest.php`

Mirror the existing `'it can sort issues by assignee name'` test:

```php
test('it can sort issues by reporter name', function () {
    $project = Project::factory()->create();
    $alice = User::factory()->create(['name' => 'Alice']);
    $bob = User::factory()->create(['name' => 'Bob']);
    Issue::factory()->create(['project_id' => $project->id, 'user_id' => $bob->id, 'title' => 'Bob issue']);
    Issue::factory()->create(['project_id' => $project->id, 'user_id' => $alice->id, 'title' => 'Alice issue']);

    $results = $this->repository->getAllPaginated($project->id, 10, ['sort' => 'reporter', 'direction' => 'AZ']);

    expect($results->items()[0]->title)->toBe('Alice issue')
        ->and($results->items()[1]->title)->toBe('Bob issue');
});
```

File: `tests/Feature/ProjectControllerTest.php`

Mirror the existing `'the type column can be toggled'` test with
`'reporter'` in place of `'type'`.

Run `php artisan test --filter=IssueRepositoryTest`,
`php artisan test --filter=ProjectControllerTest`, and
`npx vitest run resources/js/Components/Organisms/ListRow` before
committing.
