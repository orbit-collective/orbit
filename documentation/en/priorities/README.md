# Priorities

An issue's priority is a **per-project resource** backed by a real
`priorities` database table (`App\Models\Priority`) — not the fixed
`low` / `medium` / `high` enum it used to be. Every project gets a
starter scale of three priorities (`High`, `Medium`, `Low`) seeded
lazily the first time it is needed, and anyone with the right
permission can rename, recolor, re-icon, reorder, add, delete or
re-default any of them — including the seeded ones — from **Settings →
Priorities**.

## Guides, in the order you'd actually need them

1. **[Change the starter priorities](./01-change-the-starter-priorities.md)** —
   worked example adding a fourth starter priority, `Urgent`, to the
   scale every **new** project is seeded with, plus the data migration
   that brings **already-seeded** projects along and the tests to
   update.
2. **[Show priorities on a new page](./02-show-priorities-on-a-new-page.md)** —
   worked example wiring a project's real priorities (colors, icons,
   order, filter, sort) into a brand-new single-project page, using a
   hypothetical `Triage` page in the shape of the existing
   `Projects/Show` page. Never hardcode `low` / `medium` / `high` again.

## The architecture in one paragraph

`priorities` (migration `2026_10_18_100000_create_priorities_table.php`)
has `project_id`, `name`, `color` (6-digit hex), `icon` (a lucide-react
icon name), `position`, `is_default`, unique on `(project_id, name)`.
`App\Repositories\PriorityRepository` and
`App\Services\PriorityService` follow the usual Controller → Service →
Repository split (see
[`../architecture/02-backend-layered-architecture.md`](../architecture/02-backend-layered-architecture.md)):
`PriorityService::ensureSystemPriorities()` seeds
`PriorityService::SYSTEM_PRIORITIES` — the single source of the starter
scale, `High` (`#f44336`, `SignalHigh`), `Medium` (the default,
`#ff9800`, `SignalMedium`) and `Low` (`#4caf50`, `SignalLow`) —
**exactly once** per project, tracked by a
`projects.priorities_seeded_at` timestamp, not "insert whatever is
missing" on every read, which would resurrect a priority an owner
deliberately deleted. After that every priority is editable and
deletable and the list is never topped up again.
`App\Http\Controllers\PriorityController` exposes
`projects.priorities.store`, `.update`, `.destroy` and `.reorder`
(`PATCH /projects/{project}/priorities/order`, body `order` = every id
of the project, most important first), gated by the four
`projects.priorities.view` / `.create` / `.update` / `.delete`
permissions through `ProjectPolicy::viewPriorities()` /
`createPriorities()` / `updatePriorities()` / `deletePriorities()`
(Owner and Admin get all four, Member and Viewer get `view`, like the
other catalogs). An issue's priority is `issues.priority_id`, a nullable
foreign key to `priorities` with `nullOnDelete`; **`null` means "no
priority"**. Writers still speak priority **names**: assigning
`priority` on an `Issue` (`create()`, `update()`, factories, imports,
templates, automations) goes through `Issue::setPriorityAttribute()`,
which resolves the name case-insensitively against the **issue's own
project** and stores the id when the issue is saved; a name the project
has no priority for leaves the priority unchanged, an explicit `null`
clears it, and a **new** issue that was never given a priority takes the
project's default (the `creating` hook in `Issue::booted()`).
`IssueController@store`/`@update` validate the name with
`App\Rules\ProjectPriorityName`, so another project's priority name is
refused. Reads keep the old contract and add to it: `Issue::$with =
['priority']` eager-loads the relation, and `Issue::relationsToArray()`
serialises `priority` as the **name** (or `null`) and adds
`priorityDetails` — `{id, name, color, icon, position}` from
`Priority::toDetails()` — so a row can draw its icon and color without a
lookup into the project's list (which a cross-project page like the
dashboard does not have). **Filtering is by priority id**: `?priority=1,3`
→ `whereIn('issues.priority_id', ...)`, and saved filters store the same
ids. **Sorting follows `position`**: `IssueRepository::orderByPriority()`
puts the most important first and issues without a priority last
(ascending; descending is the exact reverse). The dashboard's
`statsForUser()` groups issue counts **by priority name across
projects** (the lowest position and one color/icon of the name stand for
it), counts `noPriority` apart, and reports `topPriority`: issues at
position `0` of their own project's scale, whatever it is called. The
few places that still keep a priority as plain text — a template's
`default_priority`, a Jira **priority** mapping's `orbit_value`, and a
`change_priority` automation action's `params.priority` — are rewritten
(rename) or removed/cleared (delete) by
`PriorityRepository::replaceNameReferences()`; saved filters drop a
deleted id through `removeFromSavedFilters()`. Deleting a priority takes
an optional `replacement_id` (the issues move to it, otherwise they end
up with no priority), a project always keeps **at least one** priority,
and if the deleted one was the default the flag passes to the
replacement (or the first remaining priority). `Priority` uses the
`BumpsIssueCache` concern so cached issue lists refresh, and the service
bumps `CacheVersion::ISSUES` itself after an update or a delete (the
delete's bulk `UPDATE` of the issues fires no model event).
`SettingsController::priorities()` feeds the tab — `priorities` (each
with `issueCount`), `hasPrioritiesAccess`, `canCreatePriorities` /
`canUpdatePriorities` / `canDeletePriorities` — and the other tabs that
pick a priority (issue types for template defaults, integrations for the
Jira priority mapping, automation for the change-priority action) plus
the project and issue pages get a `priorities` prop of
`Priority::toOption()` rows (`id`, `name`, `color`, `icon`, `position`,
`isDefault`; the settings tabs send an empty list without
`priorities.view`). On the frontend
`resources/js/context/ProjectPrioritiesContext.tsx`'s
`ProjectPrioritiesProvider` / `useProjectPriorities()` (`priorities`,
`defaultPriority`, `findByName()`) is the single source of "what
priorities does this project have", mounted in `Pages/Projects/Show.tsx`
and `Pages/Issues/Show.tsx`; `PriorityIcon` takes a
`{name, color, icon}` (or `null` for the dashed "no priority" ring), the
`priority` `FilterDropdown` lists one option per priority with the id as
its value, `StatusDot` has a `color` prop for a priority's own color, and
`IssueBoard` builds one column per priority (`priority-<id>`) plus
`priority-none`. The Settings → Priorities tab
(`WorkspaceSettingsPrioritiesTab.tsx`) was unlocked from
[`../settings-tabs/01-flip-a-placeholder-tab-live.md`](../settings-tabs/01-flip-a-placeholder-tab-live.md)'s
"coming soon" state; its create/edit UI is the same inline panel the
labels tab uses (`WorkspaceSettingsPriorityInlineEditor.tsx`), reordering
is move-up/move-down buttons that PATCH the new order, and deleting opens
`WorkspaceSettingsDeletePriorityModal.tsx` to choose the replacement.

## Upgrading: what the four migrations did to existing data

Four migrations ship together, in this order:

1. `2026_10_18_100000_create_priorities_table.php` — creates
   `priorities` and adds `projects.priorities_seeded_at`.
2. `2026_10_18_110000_grant_priority_permissions_to_existing_roles.php`
   — creates the four `projects.priorities.*` permissions and grants
   them to **existing** system roles (all four to Owner and Admin,
   `view` to Member and Viewer), then bumps `CacheVersion::MEMBERSHIP`.
   New permissions are not granted to roles that already exist
   automatically — see
   [`../permissions/01-add-a-new-permission.md`](../permissions/01-add-a-new-permission.md)
   — so any future priority permission needs a migration like this one.
   Custom roles are left alone.
3. `2026_10_18_120000_move_issue_priority_to_priorities.php` — adds
   `issues.priority_id`, seeds the starter scale in every project that
   has issues, points each issue at the priority carrying its old word
   (`high` → `High`, `medium` → `Medium`, `low` → `Low`), drops the old
   `issues.priority` enum column, recreates the date-order triggers
   SQLite loses when a table is rebuilt, and bumps
   `CacheVersion::ISSUES`. Its `down()` turns the scale back into three
   words: the first priority of a project is `high`, the last `low`,
   the rest `medium`.
4. `2026_10_18_130000_migrate_priority_name_references.php` — seeds
   **every** project, then brings the plain-text copies onto the scale:
   template `default_priority`, Jira priority mapping `orbit_value` and
   `change_priority` params take the canonical name (`high` → `High`),
   and a saved filter's priority words become priority **ids**. A word
   the project has no priority for is dropped (templates, saved
   filters) or left as it is (mappings, actions). Its `down()` is a
   no-op: the old words cannot be told apart from today's names.

The result: every existing issue keeps the priority it had, every
project owns an editable `High` / `Medium` / `Low` scale, and nothing
reads or writes `issues.priority` any more.
