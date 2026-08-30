# Issue views (List / Board / Calendar)

A project's issues render as a sortable table, a status-grouped Kanban
board, or a calendar laid out by issue dates — the same
`issues.data` array, three different presentations, switched with no
page reload via a flat `IssuePageLooks` string type. This category
documents how the switch works and what it takes to add a fourth view.

## Guides, in the order you'd actually need them

1. **[Add a new issue view](./01-add-a-new-issue-view.md)** — worked
   example adding a fourth view, `Timeline`, across every place the
   existing three are wired: the type, the render switch, the nav
   button (plus its keyboard shortcut), and the Account settings
   default-view picker.

## The architecture in one paragraph

`IssuePageLooks` (`resources/js/types/Issues.ts`) is `'List' | 'Board'
| 'Calendar'` — a closed union with no registry array behind it
(unlike [settings tabs'](../settings-tabs/README.md) `SETTINGS_TABS`),
so every consumer hardcodes its own list of the three values.
`Pages/Projects/Show.tsx` owns the actual `selectedLook` state for a
project page visit, seeded once from `localStorage.getItem('selectedLook')`
on mount and rendered via a flat ternary chain
(`selectedLook === 'List' ? <IssueTable /> : selectedLook === 'Board'
? <IssueBoard /> : <CalendarView />`) — all three components receive
the exact same `issues.data`, just presented differently.
**Non-obviously, switching the view from the project page's header
only updates this page's React state — it never writes back to
`localStorage`** — only Account settings → Preferences' issue-view
picker (`AccountSettingsPreferencesTab`) does that, which is why
switching views mid-session doesn't "stick" across a reload the way
changing your default view in Settings does. `1`/`2`/`3` are
registered as global [keyboard shortcuts](../shortcuts/README.md) for
the three views directly inside `Layouts/MainLayout.tsx`, categorized
`'View'`, which also builds the `tabs` array `PageHeader` renders for
the List/Board/Calendar toggle.
