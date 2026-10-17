# Labels

Issue labels are a **per-project resource** backed by a real
`labels` database table (`App\Models\Label`) — not a fixed backend
enum. Every project gets a starter taxonomy of six labels (`bug`,
`feature`, `performance`, `design`, `ux`, `chore`) seeded lazily the
first time they're needed, and project owners/admins can rename,
recolor, describe, add, or delete any label — including the seeded
ones — from **Settings → Labels**.

## Guides, in the order you'd actually need them

1. **[Add a new default label](./01-add-a-new-default-label.md)** —
   worked example adding a seventh starter label, `security`, to the
   taxonomy every new project is seeded with.
2. **[Expose project labels to a new page](./02-expose-project-labels-to-a-new-page.md)** —
   worked example wiring real per-project label colors (instead of the
   hashed fallback) into a brand-new single-project page, using a
   hypothetical `Backlog` page in the exact shape of the existing
   `Projects/Show` page.

## The architecture in one paragraph

`labels` (migration `2026_09_12_120000_create_labels_table.php`) has
`project_id`, `name`, `color`, `description`, `is_system`, unique on
`(project_id, name)`. `App\Repositories\LabelRepository` and
`App\Services\LabelService` follow this codebase's usual
Controller → Service → Repository split (see
[`../architecture/02-backend-layered-architecture.md`](../architecture/02-backend-layered-architecture.md)):
`LabelService::ensureSystemLabels()` seeds the six starter labels
**exactly once** per project, tracked by a `projects.labels_seeded_at`
timestamp — not "insert whatever's missing" on every read, which would
silently resurrect a label a project owner deliberately deleted.
`App\Http\Controllers\LabelController` exposes
`projects.labels.store` / `.update` / `.destroy`, gated by
`App\Policies\ProjectPolicy::viewLabels()` / `manageLabels()` (view:
owner/admin/member/viewer; manage: owner/admin — the same
owner/admin-only pattern as `viewIntegrations()`/`updateIntegrations()`).
An issue's labels are rows of the `issue_label` pivot
(`issue_id`, `label_id`; migration
`2026_10_17_100000_create_issue_label_table.php`, which also moved the
old JSON names over and dropped `issues.labels`), exposed as
`Issue::labels()` (`BelongsToMany`). Writers still speak **names**:
assigning `labels` on an `Issue` (`create()`, `update()`, factories,
imports, templates, automations) goes through
`Issue::setLabelsAttribute()` and is written to the pivot by
`Issue::save()`; names that are not a label of the issue's project are
ignored, and every name written through
`IssueController@store`/`@update` is validated against that project's
real `labels` rows
(`Rule::exists('labels', 'name')->where('project_id', ...)`). Reads
serialise `labels` as a list of names (`Issue::relationsToArray()`), and
listing queries must eager-load `labels`. Because storage is relational,
**filtering is by label id** (`?labels=1,2` →
`whereHas('labels', ... whereIn('labels.id', ...))`, an exact match — a
`bug` filter never catches `debug`) and **renaming a label shows the new
name on every issue at once**; deleting one cascades its pivot rows.
`Label` bumps `CacheVersion::ISSUES` on save/delete so cached issue lists
refresh. The few places that still keep a label as plain text (template
`default_labels`, Jira label mappings, add/remove-label automation
params) are rewritten or cleaned up by
`LabelRepository::replaceNameReferences()` when a label is renamed or
deleted. On the frontend,
`resources/js/context/ProjectLabelsContext.tsx`'s
`ProjectLabelsProvider`/`useProjectLabels()` is the single source of
truth for "what labels exist and what color is this one" wherever it's
mounted (currently `Pages/Projects/Show.tsx` and `Pages/Issues/Show.tsx`,
each fed by a `labels` prop their controller builds with a small
private `mapLabels()` helper) — `LabelBadge`, `EditableLabelList`, and
the `labels` `FilterDropdown` all read from it instead of a hardcoded
list, and `useProjectLabels().getColor(name)` falls back to
`hashLabelColor()` (a deterministic hash into `LABEL_COLOR_PALETTE` in
`resources/js/utils/labelColors.ts`) when no provider is mounted or the
name isn't found — which is exactly what happens today on the
cross-project `Dashboard` page. The Settings → Labels tab itself
(`WorkspaceSettingsLabelsTab.tsx`) was unlocked from
`documentation/en/settings-tabs/01-flip-a-placeholder-tab-live.md`'s
"coming soon" state and rebuilt with real CRUD wired to the routes
above; its create/edit UI is a panel that expands **inline** in place
rather than a modal — see that file's `WorkspaceSettingsLabelInlineEditor.tsx`
if you're adding another editable-in-place settings row and want to
match the pattern instead of reaching for a `Modal`.
