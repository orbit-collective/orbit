# Change the starter priorities

Worked example: adding a fourth starter priority, `Urgent`, above the
three every project is seeded with (`High`, `Medium`, `Low`). Editing
`SYSTEM_PRIORITIES` only changes what a **brand-new** project starts
with — a project whose scale was already seeded (it has a non-null
`projects.priorities_seeded_at`) keeps exactly the priorities it has now,
because `ensureSystemPriorities()` runs once per project and never
resurrects or tops up anything (see the architecture note in
`README.md`).

If you just want an extra priority in **one** project, don't touch any
code — use **Settings → Priorities** in the app itself. This guide is
for changing what every new project gets, and for bringing the projects
that already exist along when you really want to.

## Step 1 — Add the definition

File: `app/Services/PriorityService.php`

`Urgent` is the most important priority, so it takes position `0` and
the others shift down by one. The default stays `Medium`.

```php
public const array SYSTEM_PRIORITIES = [
    ['name' => 'Urgent', 'color' => '#b71c1c', 'icon' => 'Siren', 'position' => 0, 'is_default' => false],
    ['name' => 'High', 'color' => '#f44336', 'icon' => 'SignalHigh', 'position' => 1, 'is_default' => false],
    ['name' => 'Medium', 'color' => '#ff9800', 'icon' => 'SignalMedium', 'position' => 2, 'is_default' => true],
    ['name' => 'Low', 'color' => '#4caf50', 'icon' => 'SignalLow', 'position' => 3, 'is_default' => false],
];
```

`color` must be a 6-digit hex string and `icon` a lucide-react icon
name. `PriorityController@store`/`@update` validate the color with
`regex:/^#[0-9a-fA-F]{6}$/`, but `ensureSystemPriorities()` skips that
validation entirely (it inserts these rows directly through
`PriorityRepository::firstOrCreateSystemPriority()`), so a malformed
value would only surface later as a broken swatch. Prefer an icon from
`PRIORITY_ICON_OPTIONS` in `resources/js/utils/priorityIcons.ts`
(`Siren` is in it): `resolvePriorityIcon()` falls back to `Flag` for a
name lucide doesn't know, but an icon outside the list is not offered by
the settings tab's icon picker.

That's it for new projects: `ensureSystemPriorities()` iterates the
list and calls `firstOrCreateSystemPriority()` for each entry, matching
on `name`, the next time an **unseeded** project's priorities are needed
(its first issue create/update, or opening its Settings → Priorities
tab). Nothing else keeps its own copy of the list — `SYSTEM_PRIORITIES`
is also what the legacy-data migrations seed from — so there is no
frontend list, enum or `<select>` to update.

Two behaviours to be aware of: position `0` is what the dashboard's
`topPriority` counter treats as "top of the scale", so new projects now
count `Urgent` issues there instead of `High`; and the `Medium` default
means new issues are still created as `Medium`.

## Step 2 — Bring existing projects along (optional)

Skip this and every existing project simply keeps its three priorities,
which is usually right: those projects' owners may have renamed or
deleted `High`/`Low` on purpose. If you do want `Urgent` everywhere, ship
a data migration — never loop over projects in a service or a request.
It must only touch projects that **have been seeded** (an unseeded one
gets `Urgent` from Step 1 when it is seeded), be idempotent, leave
projects that already have a priority of that name alone, and bump the
issue cache because it writes through the query builder (no model event
runs).

File: `database/migrations/2026_10_19_100000_add_urgent_priority_to_seeded_projects.php`

```php
<?php

use App\Services\PriorityService;
use App\Support\Cache\CacheVersion;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Projects seeded before "Urgent" joined the starter scale get it at the top
 * of their own scale (the others move down one place). A project that
 * already has a priority called "Urgent" in any case is left alone, and an
 * unseeded project is skipped: it receives the new starter scale when it is
 * seeded.
 */
return new class extends Migration
{
    public function up(): void
    {
        $urgent = collect(PriorityService::SYSTEM_PRIORITIES)->firstWhere('name', 'Urgent');

        DB::table('projects')
            ->whereNotNull('priorities_seeded_at')
            ->pluck('id')
            ->each(function (int $projectId) use ($urgent) {
                $exists = DB::table('priorities')
                    ->where('project_id', $projectId)
                    ->whereRaw('lower(name) = ?', [mb_strtolower($urgent['name'])])
                    ->exists();

                if ($exists) {
                    return;
                }

                DB::table('priorities')->where('project_id', $projectId)->increment('position');

                DB::table('priorities')->insert([
                    'project_id' => $projectId,
                    'name' => $urgent['name'],
                    'color' => $urgent['color'],
                    'icon' => $urgent['icon'],
                    'position' => 0,
                    'is_default' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });

        // Written through the query builder, so no model event dropped the
        // cached issue lists (they carry each issue's priority position).
        CacheVersion::bump(CacheVersion::ISSUES);
    }

    public function down(): void
    {
        // Issues may already use the new priority; deleting it would orphan
        // them silently, so rolling back is left to a human.
    }
};
```

Like the real `2026_10_18_*` migrations it reads the definition from
`PriorityService::SYSTEM_PRIORITIES` instead of repeating the values.
That couples the migration to the constant's *current* value, which is
fine for a one-off you run once; if the starter list changes again
later, this migration should not silently change meaning — copy the
literal values in if it has to stay replayable.

## Step 3 — Update the tests that assert the starter scale

File: `tests/Feature/PriorityServiceTest.php`

```php
test('a project is seeded with High, Medium and Low in that order, Medium being the default', function () {
    $priorities = $this->service->getPriorities($this->project);

    expect($priorities->pluck('name')->all())->toBe(['High', 'Medium', 'Low'])
        ->and($priorities->pluck('position')->all())->toBe([0, 1, 2])
        ->and($priorities->firstWhere('is_default', true)->name)->toBe('Medium')
        ->and($this->project->fresh()->priorities_seeded_at)->not->toBeNull();
});
```

becomes:

```php
test('a project is seeded with Urgent, High, Medium and Low in that order, Medium being the default', function () {
    $priorities = $this->service->getPriorities($this->project);

    expect($priorities->pluck('name')->all())->toBe(['Urgent', 'High', 'Medium', 'Low'])
        ->and($priorities->pluck('position')->all())->toBe([0, 1, 2, 3])
        ->and($priorities->firstWhere('is_default', true)->name)->toBe('Medium')
        ->and($this->project->fresh()->priorities_seeded_at)->not->toBeNull();
});
```

Then run the whole PHP suite, not just that file — a lot of tests assume
the exact starter scale. Expect to adjust:

- tests that **create or rename a priority to `Urgent`** (e.g. in
  `PriorityServiceTest`, `PriorityControllerTest`, `IssueControllerTest`)
  — the name now exists in a seeded project and is refused as a
  duplicate, so give those tests another name (`Critical`);
- tests that assert a **count or position** of the seeded scale, such as
  `->position` `3` for a newly created priority (now `4`) or
  `priorities()->count()` `4` (now `5`);
- tests asserting the dashboard's `topPriority`/`priority` stats, if they
  rely on `High` being position `0`.

Add one test for the migration, modelled on
`tests/Feature/MoveIssuePriorityTest.php` /
`tests/Feature/MigratePriorityNameReferencesTest.php`: create one project
with its three old priorities by hand and set `priorities_seeded_at`
(`ensureSystemPriorities()` would already seed `Urgent`), run the migration, and assert `Urgent` is at
position `0`, the others shifted down by one, the default is unchanged,
running it twice does not add a second `Urgent`, and an unseeded project
gets no row.

The frontend has no copy of the starter scale to change — the Vitest
and Storybook fixtures (`priorities` in `resources/js/stories/fixtures.ts`)
are sample data, not a mirror of `SYSTEM_PRIORITIES`.

Run `php artisan test --filter=Priority` and then `composer test`
before committing.
