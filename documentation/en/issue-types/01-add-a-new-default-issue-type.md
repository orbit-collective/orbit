# Add a new default issue type

Worked example: adding a 17th starter type, `Compliance`, to the 16
every project is seeded with. This only changes what a **brand-new**
project starts with — an existing project that already had its issue
types seeded keeps exactly the types it has now (see the architecture
note in `README.md` about why `ensureSystemIssueTypes()` never
resurrects a deleted one).

If you just want a one-off **custom** issue type for a single project,
don't touch any code — use **Settings → Issue Types** in the app
itself. This guide is for changing what every project gets by default.

## Step 1 — Add the definition

File: `app/Services/IssueTypeService.php`

```php
private const array SYSTEM_ISSUE_TYPES = [
    ['name' => 'Task', 'icon' => 'SquareCheck', 'color' => '#3b82f6', 'description' => 'A unit of work to be done.'],
    ['name' => 'Feature', 'icon' => 'Sparkles', 'color' => '#6366f1', 'description' => 'A new capability or request.'],
    ['name' => 'Story', 'icon' => 'BookOpen', 'color' => '#22c55e', 'description' => 'A user-facing piece of functionality.'],
    ['name' => 'Bug', 'icon' => 'Bug', 'color' => '#ef4444', 'description' => 'Something isn’t working as expected.'],
    ['name' => 'Epic', 'icon' => 'Zap', 'color' => '#a855f7', 'description' => 'A large body of work that can be broken down into smaller issues.', 'allows_children' => true],
    ['name' => 'Spike', 'icon' => 'Microscope', 'color' => '#06b6d4', 'description' => 'A time-boxed investigation into an unknown.'],
    ['name' => 'Chore', 'icon' => 'Wrench', 'color' => '#78716c', 'description' => 'Maintenance work with no direct user impact.'],
    ['name' => 'Improvement', 'icon' => 'TrendingUp', 'color' => '#14b8a6', 'description' => 'An enhancement to something that already exists.'],
    ['name' => 'Incident', 'icon' => 'Flame', 'color' => '#f97316', 'description' => 'An active production issue requiring attention.'],
    ['name' => 'Security', 'icon' => 'Shield', 'color' => '#b91c1c', 'description' => 'A security concern or vulnerability.'],
    ['name' => 'Infrastructure', 'icon' => 'Server', 'color' => '#64748b', 'description' => 'Work related to infrastructure or tooling.'],
    ['name' => 'Research', 'icon' => 'FlaskConical', 'color' => '#8b5cf6', 'description' => 'Open-ended exploration or analysis.'],
    ['name' => 'Experiment', 'icon' => 'TestTube', 'color' => '#eab308', 'description' => 'A trial to validate a hypothesis.'],
    ['name' => 'Documentation', 'icon' => 'FileText', 'color' => '#0ea5e9', 'description' => 'Writing or updating documentation.'],
    ['name' => 'Design', 'icon' => 'Palette', 'color' => '#ec4899', 'description' => 'Visual, layout, or interaction design work.'],
    ['name' => 'AI Task', 'icon' => 'Bot', 'color' => '#10b981', 'description' => 'A task intended to be carried out by an AI agent.'],
    ['name' => 'Compliance', 'icon' => 'Scale', 'color' => '#0d9488', 'description' => 'Regulatory or policy compliance work.'],
];
```

Two things to get right:

- `color` must be a 6-digit hex string — `IssueTypeController@store`/`@update`
  validate it with `regex:/^#[0-9a-fA-F]{6}$/`, and `ensureSystemIssueTypes()`
  skips that validation entirely (it inserts these rows directly through
  `IssueTypeRepository::firstOrCreateSystemType()`), so a malformed hex
  here would only surface later as a broken color swatch in the UI —
  double check it's valid before committing.
- `icon` must be a key that actually exists in lucide-react's `icons`
  map, not just a named export from the package — some exports are
  deprecated aliases that aren't in that map (e.g. `CheckSquare` isn't,
  `SquareCheck` is, which is why `Task` above uses the latter). Verify
  with a one-off Node check before picking one:

  ```bash
  node -e "const { icons } = require('lucide-react'); console.log('Scale' in icons);"
  ```

  If it prints `false`, the frontend's `Icon` atom falls back to a
  generic warning icon at render time and logs a console warning — it
  won't break the build, but it will look wrong in the badge.

Only `name`, `icon`, `color`, and `description` are required per
entry; add `'allows_children' => true` only for a type meant to hold
sub-issues, the way `Epic` does.

That's it on the backend — `ensureSystemIssueTypes()` iterates
`SYSTEM_ISSUE_TYPES`, calls
`$this->issueTypeRepository->firstOrCreateSystemType($project, $definition)`
for each one, and gives each a default three-status workflow via the
private `ensureDefaultWorkflow()` method — so the new entry is picked
up automatically the next time a **new** project's issue types are
seeded (its first issue create/update, or the first time someone opens
its Settings → Issue Types tab — see `IssueTypeController`/`IssueController`,
both of which call `ensureSystemIssueTypes()` before doing anything
issue-type-related).

## Step 2 — Update the tests that assert the fixed count/list

File: `tests/Feature/IssueTypeServiceTest.php`

```php
test('it seeds the 16 system issue types for a project on first use', function () {
    $project = Project::factory()->create();

    $this->service->ensureSystemIssueTypes($project);

    $this->assertDatabaseCount('issue_types', 16);
    expect($project->issueTypes()->where('is_system', true)->pluck('name')->sort()->values()->all())
        ->toBe([
            'AI Task', 'Bug', 'Chore', 'Design', 'Documentation', 'Epic', 'Experiment',
            'Feature', 'Improvement', 'Incident', 'Infrastructure', 'Research',
            'Security', 'Spike', 'Story', 'Task',
        ]);
});
```

Bump `16` to `17` and add `'Compliance'` to the sorted list (it sorts
alphabetically right after `'Chore'` and before `'Design'`):

```php
test('it seeds the 17 system issue types for a project on first use', function () {
    $project = Project::factory()->create();

    $this->service->ensureSystemIssueTypes($project);

    $this->assertDatabaseCount('issue_types', 17);
    expect($project->issueTypes()->where('is_system', true)->pluck('name')->sort()->values()->all())
        ->toBe([
            'AI Task', 'Bug', 'Chore', 'Compliance', 'Design', 'Documentation', 'Epic', 'Experiment',
            'Feature', 'Improvement', 'Incident', 'Infrastructure', 'Research',
            'Security', 'Spike', 'Story', 'Task',
        ]);
});
```

`tests/Feature/IssueTypeServiceTest.php`'s
`'getIssueTypes seeds system issue types and returns them for the project'`
test also asserts a fixed count (`toHaveCount(16)`) — bump that one to
`17` too.

## Step 3 — Nothing else needs to change

`IssueTypeBadge`, the Settings → Issue Types catalog, the issues list's
`type` column, and the quick-add flow's default-type resolution
(`IssueTypeService::defaultIssueType()`, which always resolves to
`Task` regardless of how many other types exist) all read the current
type list from `IssueTypeService::getIssueTypes()`/the `issueTypes`
prop `SettingsController` builds — there's no frontend union type or
hardcoded list to update, the same way there isn't for labels (see
[`../labels/01-add-a-new-default-label.md`](../labels/01-add-a-new-default-label.md)).

Run `php artisan test --filter=IssueTypeServiceTest` before committing.
