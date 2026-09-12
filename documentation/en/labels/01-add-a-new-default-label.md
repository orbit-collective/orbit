# Add a new default label

Worked example: adding a seventh starter label, `security`, to the six
every project is seeded with (`bug`, `feature`, `performance`,
`design`, `ux`, `chore`). This only changes what a **brand-new**
project starts with — an existing project that already had its labels
seeded keeps exactly the labels it has now (see the architecture note
in `README.md` about why `ensureSystemLabels()` never resurrects a
deleted one).

If you just want to add a one-off **custom** label to a single
project, don't touch any code — use **Settings → Labels** in the app
itself. This guide is for changing what every project gets by default.

## Step 1 — Add the definition

File: `app/Services/LabelService.php`

```php
private const array SYSTEM_LABELS = [
    ['name' => 'bug', 'color' => '#f44336', 'description' => 'Something isn’t working as expected.'],
    ['name' => 'feature', 'color' => '#2196f3', 'description' => 'A new capability or request.'],
    ['name' => 'performance', 'color' => '#9c27b0', 'description' => 'Related to speed, load, or resource usage.'],
    ['name' => 'design', 'color' => '#00bcd4', 'description' => 'Visual, layout, or interaction design work.'],
    ['name' => 'ux', 'color' => '#009688', 'description' => 'Usability and user-experience concerns.'],
    ['name' => 'chore', 'color' => '#e91e63', 'description' => 'Maintenance work with no direct user impact.'],
    ['name' => 'security', 'color' => '#ff5722', 'description' => 'A vulnerability or security-relevant change.'],
];
```

`color` must be a 6-digit hex string — `LabelController@store`/`@update`
validate it with `regex:/^#[0-9a-fA-F]{6}$/`, and `ensureSystemLabels()`
skips that validation entirely (it inserts these rows directly through
`LabelRepository::firstOrCreateSystemLabel()`), so a malformed hex here
would only surface later as a broken color swatch in the UI — double
check it's valid before committing.

That's it on the backend — `ensureSystemLabels()` iterates
`SYSTEM_LABELS` and calls
`$this->labelRepository->firstOrCreateSystemLabel($project, $definition)`
for each one, so the new entry is picked up automatically the next
time a **new** project's labels are seeded (on its first issue
create/update, or the first time someone opens its Settings → Labels
tab — see `LabelController`/`IssueController`, both of which call
`ensureSystemLabels()` before doing anything label-related).

## Step 2 — Update the tests that assert the fixed count/list

File: `tests/Feature/LabelServiceTest.php`

```php
test('it seeds the 6 system labels for a project on first use', function () {
    $project = Project::factory()->create();

    $this->service->ensureSystemLabels($project);

    $this->assertDatabaseCount('labels', 6);
    expect($project->labels()->where('is_system', true)->pluck('name')->sort()->values()->all())
        ->toBe(['bug', 'chore', 'design', 'feature', 'performance', 'ux']);
});
```

Bump `6` to `7` and add `'security'` to the sorted list (it sorts
alphabetically after `'performance'` and before `'ux'`):

```php
test('it seeds the 7 system labels for a project on first use', function () {
    $project = Project::factory()->create();

    $this->service->ensureSystemLabels($project);

    $this->assertDatabaseCount('labels', 7);
    expect($project->labels()->where('is_system', true)->pluck('name')->sort()->values()->all())
        ->toBe(['bug', 'chore', 'design', 'feature', 'performance', 'security', 'ux']);
});
```

`tests/Feature/LabelServiceTest.php`'s
`'getLabels seeds system labels and returns them for the project'` test
also asserts a fixed count (`toHaveCount(6)`) — bump that one to `7`
too.

## Step 3 — Nothing else needs to change

Unlike the old fixed `App\Enums\IssueLabel` this replaced, there is no
frontend union type or hardcoded list to update: `LabelBadge`,
`EditableLabelList`, the `labels` `FilterDropdown`, and
`WorkspaceSettingsLabelsTab` all read the current label list from
`useProjectLabels()`/the `labels` prop a controller builds from
`LabelService::getLabels()` — see
[`../architecture/03-frontend-architecture-and-atomic-design.md`](../architecture/03-frontend-architecture-and-atomic-design.md)
for why that's the case generally, and
[`02-expose-project-labels-to-a-new-page.md`](./02-expose-project-labels-to-a-new-page.md)
for how a page gets wired up to that data in the first place.

Run `php artisan test --filter=LabelServiceTest` before committing.
