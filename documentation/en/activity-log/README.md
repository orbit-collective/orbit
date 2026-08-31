# Activity log

Every project-changing action across the app writes a plain-text
`ActivityLog` row — "Changed Jane's role to admin", "Deleted the
\"Owner\" role" — and it's read back in two places today: the
Dashboard's "Recent Work Activity" panel (per-user, via
`ActivityLogService::getRecentForUser()`) and a project's **Activity**
issue view (per-project, via `getRecentForProject()`). This category
documents the write side (already used everywhere) and how to surface
the read side in a third place.

## Guides, in the order you'd actually need them

1. **[Log a new kind of activity](./01-log-a-new-kind-of-activity.md)**
   — the one-line pattern every Service already follows; read this
   first since it's the pattern you're almost certainly already using
   correctly without realizing it's "the activity log system."
2. **[Surface the activity log in the UI](./02-surface-the-activity-log-in-the-ui.md)**
   — worked example adding a third read surface (an issue's own
   activity), reusing the exact `ActivityLogs`/`ActivityLogItem`
   components the Dashboard and project Activity view already share.

## The architecture in one paragraph

`ActivityLog` (`app/Models/ActivityLog.php`) is deliberately unstructured:
`project_id` (nullable — `null` for account-level activity like a
password change), `user_id`, and a single free-text `body` column —
there is no `type`/`action` enum to extend, unlike
[notifications](../notifications/README.md) or
[alerts](../alerts/README.md). `ActivityLogService::log(?int $projectId,
string $body, ?int $userId = null)` is the one method every other
Service calls as a side effect of whatever it's actually doing —
`$userId` defaults to `auth()->id()` when omitted, which is why most
call sites (see e.g. `RoleService`/`ProjectMemberService`) never pass
it explicitly. On the read side, `ActivityLogRepository` has
`getRecentForUser()` and `getRecentForProject()` (both
`latest()->limit($limit)`, eager-loading `user`), each called from one
Controller today: `DashboardController::index()` maps
`getRecentForUser($userId, 15)` into an `activityLogs` prop, and
`ProjectController::show()` maps `getRecentForProject($project->id, 50)`
into its own `activityLogs` prop for the Activity issue view (see
[`../issue-views/README.md`](../issue-views/README.md)). Both
Controllers map to the exact same shape —
`{ id, body, userName, createdAt }`, `createdAt` already
human-formatted server-side via `created_at->diffForHumans()` — typed
once as `ActivityLogEntry` (`resources/js/types/ActivityLog.ts`) and
rendered by the same pair of frontend components regardless of which
page it's on: `ActivityLogs` (list + empty state) wrapping
`ActivityLogItem` (one entry — a colored dot derived from the body
text via `getActivityLogVisual()` in `resources/js/utils/activityLog.ts`,
the user name, the body, and the timestamp). Reusing that exact pair
of components is what makes guide 2's third surface a small change
rather than a new UI from scratch.
