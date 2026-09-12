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
An issue's `labels` column is still a plain JSON array of label
**name strings** (`Issue::casts()['labels'] = 'array'`, no more
`App\Enums\IssueLabel` backing it) — but every name written through
`IssueController@store`/`@update` is now validated against that
project's real `labels` rows
(`Rule::exists('labels', 'name')->where('project_id', ...)`) instead of
a fixed enum. That's a deliberate scope tradeoff worth knowing before
you touch it: a label is identified by **name**, not by a relational
pivot to issues, so renaming or deleting a label does **not**
retroactively update or strip it from issues that already reference
the old name — an issue keeps whatever string it was tagged with until
someone edits its labels again. On the frontend,
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
