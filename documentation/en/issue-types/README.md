# Issue Types

Issue types are a **per-project resource** backed by a real `issue_types`
database table (`App\Models\IssueType`) — not a fixed backend enum, and
not a plain string on the issue like the old `Issue.type` field used to
be. Every project gets a starter catalog of 16 system types (Task,
Feature, Story, Bug, Epic, Spike, Chore, Improvement, Incident,
Security, Infrastructure, Research, Experiment, Documentation, Design,
AI Task) seeded lazily the first time they're needed, and project
owners/admins can rename, recolor, describe, restrict, add, or delete
any type — including the seeded ones (system types can be edited but
never deleted) — from **Settings → Issue Types**. Each type owns its
own **workflow** (a small state machine of statuses and legal
transitions between them), can be marked as allowing **sub-issues**
(only an Epic-shaped type would set this), can require specific issue
fields to be filled in before an issue of that type can be saved, can
restrict who's allowed to create one, and can define reusable
**templates** that prefill an issue's description/labels/priority.

## Guides, in the order you'd actually need them

1. **[Add a new default issue type](./01-add-a-new-default-issue-type.md)**
   — worked example adding a 17th starter type, `Compliance`, to the
   catalog every new project is seeded with.
2. **[Add a workflow status category](./02-add-a-workflow-status-category.md)**
   — worked example extending the fixed `todo`/`in_progress`/`done`
   category enum with a fourth bucket, `blocked`.
3. **[Extend required fields](./03-extend-required-fields.md)** —
   worked example adding a new required-field option (`parent`, "must
   be a sub-issue") to the fixed set an issue type can demand.
4. **[Add a new list column](./04-add-a-new-list-column.md)** —
   worked example adding a `Reporter` column to the issues table,
   using the column-registry this feature introduced.

## The architecture in one paragraph

`issue_types` (migration `2026_09_12_140000_create_issue_types_table.php`)
has `project_id`, `name`, `icon` (a lucide-react component name),
`color`, `description`, `is_system`, `allows_children`,
`is_top_level`, `required_fields` (JSON array),
`restricted_role_types` (JSON array), `sort_order`, unique on
`(project_id, name)`. The model serializes itself into the exact
camelCase shape `resources/js/types/IssueTypes.ts` declares (see
`IssueType::toArray()`), which is why no controller needs a mapping
helper of its own and why a type nested inside an issue looks identical
to one sent as a top-level page prop. `App\Repositories\IssueTypeRepository`
and `App\Services\IssueTypeService` follow this codebase's usual
Controller → Service → Repository split (see
[`../architecture/02-backend-layered-architecture.md`](../architecture/02-backend-layered-architecture.md)):
`IssueTypeService::ensureSystemIssueTypes()` seeds the 16 starter types
— each with a default three-status workflow — **exactly once** per
project, tracked by a `projects.issue_types_seeded_at` timestamp, the
same pattern `LabelService::ensureSystemLabels()` uses (see
[`../labels/README.md`](../labels/README.md)) and for the same reason:
"insert whatever's missing" on every read would silently resurrect a
type an owner deliberately deleted. Unlike labels, though, an issue's
type is a **real foreign key** (`issues.issue_type_id`), not a name
string — renaming a type in Settings is instantly reflected on every
issue that references it, and a type can't be deleted while any issue
still uses it (`IssueTypeService::deleteIssueType()` throws a
`ValidationException` in that case; a system type can never be
deleted at all).

Each issue type owns its own **workflow**: `workflow_statuses`
(`name`, `color`, `category` — one of `todo`/`in_progress`/`done`, cast
to `App\Enums\WorkflowStatusCategory` — and `is_initial`) and
`workflow_transitions` (`from_status_id` → `to_status_id`), both
scoped to `issue_type_id`. `App\Services\WorkflowService` owns
add/rename/delete for statuses and add/remove for transitions;
`IssueController::update` calls
`WorkflowService::assertTransitionAllowed()` before accepting a status
change, so an issue can only move to a status its type's workflow
actually allows moving to. Exactly one status per workflow carries
`is_initial` — the one new issues start in; promoting another demotes
the previous holder, which is what
`WorkflowService::setInitialStatus()` (route
`projects.issue-types.statuses.initial`) does from the workflow modal.

An issue's status is changed by sending **`workflow_status_id`**, which
is the only way to reach a custom status like "In Review" — the issue
detail sidebar builds its picker from the type's own statuses, filtered
down to the ones a transition actually leads to from the current one.
The legacy `issues.status` enum (`open`/`in_progress`/`closed`) still
exists and is kept in sync in both directions for backward
compatibility: `IssueTypeService::legacyValueForWorkflowStatus()`
collapses a picked status back onto the enum by category, and
`IssueTypeService::resolveWorkflowStatusForLegacyValue()` maps the
other way — to the **best-fit status by category**, not by exact name,
so a request that still sends the old `status` field resolves to
something sensible even for a type whose workflow has been customized
away from the three default statuses. Every system type's default workflow is a simple three-status
board (To Do/In Progress/Done) with **every** status able to transition
to every other one (a full mesh) — this matches the pre-Issue-Types
behavior, where any `IssueStatus` value could be set at any time; a
custom, restrictive workflow is something a project has to build
deliberately from **Settings → Issue Types → Manage workflow**.

Permissions follow the same `Permission` enum / `ProjectPolicy` /
`RoleService` tier pattern as labels: `ISSUE_TYPES_VIEW/CREATE/UPDATE/DELETE`
and `WORKFLOW_UPDATE` (view: owner/admin/member/viewer; every mutation:
owner/admin only — see
[`../permissions/README.md`](../permissions/README.md) if you need to
add a new permission of your own). On top of that project-wide gate,
each issue type can carry its own `restricted_role_types` (a JSON array
of `owner`/`admin`/`member`/`viewer` values) — `App\Policies\IssuePolicy::createOfType()`
is a second, narrower check applied only when actually creating an
issue of that specific type, on top of the general `issues.create`
check; an empty `restricted_role_types` array means "no extra
restriction, anyone who can create issues at all may use this type."

Hierarchy reuses the pre-existing `issues.parent_id` column — nothing
new there — gated by three per-type settings. `allows_children` decides
whether an issue of this type can be a parent at all. The
`issue_type_children` pivot (`IssueType::allowedChildTypes()`) narrows
*which* types may be nested underneath it; an **empty** pivot set means
unrestricted, so only configuring at least one row starts restricting.
`is_top_level` decides the other direction: a type with it turned off
exists only as a sub-issue and cannot be created as a root row, which
is what keeps the "New issue" picker down to the handful of types a
project actually starts work from (`Task`, `Feature`, `Story`, `Bug`,
`Epic` out of the box — every other system type is seeded sub-issue
only). All three are toggled from **Settings → Issue Types**, and
`App\Services\IssueService::assertValidParent()` enforces every one of
them — plus same-project, no self-parenting, and no cycles — whichever
endpoint (create or update) is setting `parent_id`. An issue's own
detail view lists its children and creates new ones through
`resources/js/Components/Organisms/IssueChildrenPanel/IssueChildrenPanel.tsx`,
rendered only for a type whose `allows_children` is on. On the frontend,
`resources/js/hooks/useIssueHierarchy.ts` turns the flat, paginated
`issues` array into a rendered tree by grouping on `parent_id` — this
is a **page-local** hierarchy: a child whose parent didn't happen to
land on the same page of results renders as a top-level row instead,
there's no cross-page tree. Collapsed-row state persists to
`localStorage` per project, the same pattern
`resources/js/hooks/useTableResizing.ts` already uses for column
widths.

Issue creation itself was redesigned around this feature: the old
`NewIssueModal` is gone, replaced by
`resources/js/Components/Molecules/QuickAddIssueRow/QuickAddIssueRow.tsx`,
an inline row at the top of `IssueTable` (and, for a type with
`allows_children`, a second "Add sub-issue" row right under it). It
renders as a real table row: the title and the **issue type** are
editable, while the remaining cells preview what the issue will be
created with — the id it will get (`IssueService::peekNextIssueId()`,
a hint only, since a concurrent create wins the real id), the selected
type's initial workflow status, `Medium` priority, and unassigned. The
top-level row offers only `is_top_level` types; a nested one offers
only the parent type's allowed children. Submitting posts to
`issues.store` with the title, the chosen `issue_type_id` (falling back
to `IssueTypeService::defaultIssueType()` when none is sent) and
`parent_id` for a sub-issue — open the issue afterward to fill in the
rest, or apply an
`IssueTypeTemplate` (`name`, `description`, `default_priority`,
`default_labels`, managed from **Settings → Issue Types → Manage
templates**) via a `template_id` on that same create request, which
prefills `description`/`labels` when they're otherwise empty.
`resources/js/utils/quickAddIssueEvent.ts` is a tiny `window` event bus
so `MainLayout`'s global "New issue" button/keyboard shortcuts can ask
whichever `IssueTable` happens to be mounted to reveal and focus its
quick-add input, without prop-drilling a ref across the layout
boundary — it's a no-op on a page (Board/Calendar/Activity) that
doesn't render an `IssueTable` at all.
