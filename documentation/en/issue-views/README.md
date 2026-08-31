# Issue views (List / Board / Calendar / Activity)

A project's issues render as a sortable table, a status-grouped Kanban
board, a calendar laid out by issue dates, or a chronological activity
feed — the same `issues.data` array (plus, for Activity, a separate
`activityLogs` prop) presented four different ways, switched with no
page reload via a flat `IssuePageLooks` string type. This category
documents how the switch works and what it takes to add a fifth view.

## Guides, in the order you'd actually need them

1. **[Add a new issue view](./01-add-a-new-issue-view.md)** — worked
   example adding a fifth view, `Timeline`, across every place the
   existing four are wired: the type, the render switch, the nav
   button (plus its keyboard shortcut), and the Account settings
   default-view picker.

## The architecture in one paragraph

`IssuePageLooks` (`resources/js/types/Issues.ts`) is `'List' | 'Board'
| 'Calendar' | 'Activity'` — a closed union with no registry array
behind it (unlike [settings tabs'](../settings-tabs/README.md)
`SETTINGS_TABS`), so every consumer hardcodes its own list of the four
values. `Pages/Projects/Show.tsx` owns the actual `selectedLook` state
for a project page visit, seeded once from
`localStorage.getItem('selectedLook')` on mount and rendered via a
flat ternary chain (`selectedLook === 'List' ? <IssueTable /> :
selectedLook === 'Board' ? <IssueBoard /> : selectedLook === 'Calendar'
? <CalendarView /> : <ActivityLogs logs={activityLogs} />`) — List,
Board, and Calendar all receive the exact same `issues.data`, just
presented differently, while Activity instead reads
`activityLogs` (an `ActivityLogEntry[]`, threaded down from
`ProjectController::show()` via `ActivityLogService::getRecentForProject()`
— see [`../activity-log/README.md`](../activity-log/README.md) for
that read path). **Non-obviously, switching the view from the project
page's header only updates this page's React state — it never writes
back to `localStorage`** — only Account settings → Preferences'
issue-view picker (`AccountSettingsPreferencesTab`) does that, which is
why switching views mid-session doesn't "stick" across a reload the
way changing your default view in Settings does. `1`/`2`/`3`/`4` are
registered as global [keyboard shortcuts](../shortcuts/README.md) for
the four views directly inside `Layouts/MainLayout.tsx`, categorized
`'View'`, which also builds the `tabs` array `PageHeader` renders for
the List/Board/Calendar/Activity toggle.
