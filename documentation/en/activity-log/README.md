# Activity log

Every project-changing action across the app writes a plain-text
`ActivityLog` row — "Changed Jane's role to admin", "Deleted the
\"Owner\" role" — but, surprisingly, **nothing in the app currently
reads them back**. This category documents the write side (already
used everywhere) and the one thing worth doing next: actually
surfacing it somewhere.

## Guides, in the order you'd actually need them

1. **[Log a new kind of activity](./01-log-a-new-kind-of-activity.md)**
   — the one-line pattern every Service already follows; read this
   first since it's the pattern you're almost certainly already using
   correctly without realizing it's "the activity log system."
2. **[Surface the activity log in the UI](./02-surface-the-activity-log-in-the-ui.md)**
   — worked example actually rendering a project's recent activity,
   since today the read side exists in the Repository but is called
   from nowhere.

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
it explicitly. `ActivityLogRepository` already has read methods,
`getRecentForProject()`/`getRecentForUser()` (both `latest()->limit(15)`),
but neither is called from any Service or Controller today — the
activity log is write-only in practice until something calls them
(see guide 2).
