# Add a new issue view

Worked example: adding a fifth view, **Timeline**, alongside the
existing List/Board/Calendar/Activity four. Six places need it — miss
one and the new view either can't be reached, has no shortcut, isn't
offered as a default, or renders a broken preview, depending on which.

## Step 1 — Widen the type

File: `resources/js/types/Issues.ts`

```ts
export type IssuePageLooks = 'List' | 'Board' | 'Calendar' | 'Activity' | 'Timeline';
```

## Step 2 — Render it

File: `resources/js/Pages/Projects/Show.tsx`

```tsx
{selectedLook === 'List' ? (
    <IssueTable
        issues={issues.data}
        queryParams={queryParams}
        project={project}
        pagination={
            <Pagination
                links={issues.links}
                from={issues.from}
                to={issues.to}
                total={issues.total}
                queryParams={queryParams}
            />
        }
    />
) : selectedLook === 'Board' ? (
    <>
        <div className={'flex flex-1 flex-row overflow-hidden'}>
            <IssueBoard issues={issues.data} />
        </div>
        <Pagination
            links={issues.links}
            from={issues.from}
            to={issues.to}
            total={issues.total}
            queryParams={queryParams}
        />
    </>
) : selectedLook === 'Calendar' ? (
    <CalendarView issues={issues.data} />
) : selectedLook === 'Activity' ? (
    <ActivityLogs logs={activityLogs} />
) : (
    <TimelineView issues={issues.data} />
)}
```

List, Board, and Calendar all take the same `issues.data` array and
present it differently — Activity is the odd one out, reading a
separate `activityLogs` prop instead (see
[`../activity-log/README.md`](../activity-log/README.md) for where
that comes from). A new view built on top of `issues.data`, like this
Timeline example, is a new component consuming that same prop, not a
new data-fetching path. Add
`import TimelineView from '@/Components/Organisms/TimelineView/TimelineView';`
to the file's imports and build `TimelineView` following whichever
existing view's internal structure is closest (a horizontal axis by
date has more in common with `CalendarView` than `IssueBoard`).

Also update the `localStorage` validation guard right above the
render, in the same file:

```ts
const [selectedLook, setSelectedLook] = useState<IssuePageLooks>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('selectedLook');
        if (
            saved === 'List' ||
            saved === 'Board' ||
            saved === 'Calendar' ||
            saved === 'Activity' ||
            saved === 'Timeline'
        ) {
            return saved;
        }
    }
    return 'List';
});
```

Skip this and a user who picked Timeline as their default view (step
5) gets silently bounced back to List on their next page load — the
guard rejects any string it doesn't explicitly recognize, including a
perfectly valid new one.

## Step 3 — Add the nav tab and its shortcut

File: `resources/js/Layouts/MainLayout.tsx` — the project page's
header (icon, title, view tabs, "New issue" action) is a `PageHeader`
configured from this layout rather than a dedicated nav component, so
both the shortcut and the tab button live here.

```tsx
const shortcuts = useMemo(
    (): ShortcutDefinition[] => [
        // ...existing 'c'/'ctrl+i' shortcuts...
        {
            key: '1',
            description: 'List view',
            category: 'View',
            action: () => setSelectedLook('List'),
        },
        {
            key: '2',
            description: 'Board view',
            category: 'View',
            action: () => setSelectedLook('Board'),
        },
        {
            key: '3',
            description: 'Calendar view',
            category: 'View',
            action: () => setSelectedLook('Calendar'),
        },
        {
            key: '4',
            description: 'Activity view',
            category: 'View',
            action: () => setSelectedLook('Activity'),
        },
        {
            key: '5',
            description: 'Timeline view',
            category: 'View',
            action: () => setSelectedLook('Timeline'),
        },
    ],
    [setSelectedLook],
);
```

then a matching entry in the `tabs` array passed to `<PageHeader>`,
copying the exact shape of the `List`/`Board`/`Calendar`/`Activity`
entries (`{ id: 'Timeline', label: 'Timeline', icon: ..., isActive:
selectedLook === 'Timeline', onClick: () => setSelectedLook('Timeline')
}`) — `PageHeader` renders each `tabs` entry as a nav button beneath
the title, in a horizontally-scrollable row on narrow viewports so
adding a fifth tab doesn't need any layout changes of its own. See
[`../shortcuts/02-register-a-global-shortcut.md`](../shortcuts/02-register-a-global-shortcut.md)
for the general shape of adding a shortcut like this one, though this
one is scoped to the project page rather than truly global.

## Step 4 — Add it as a default-view option in Account settings

File: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsPreferencesTab.tsx`

```ts
const issueViewOptions: Array<{
    id: IssuePageLooks;
    icon: 'Rows3' | 'Columns3' | 'CalendarDays' | 'Activity' | 'ChartGantt';
    description: string;
}> = [
    {
        id: 'List',
        icon: 'Rows3',
        description: 'A dense, sortable table of every issue.',
    },
    {
        id: 'Board',
        icon: 'Columns3',
        description: 'Kanban columns grouped by status or priority.',
    },
    {
        id: 'Calendar',
        icon: 'CalendarDays',
        description: 'Issues plotted against their due dates.',
    },
    {
        id: 'Activity',
        icon: 'Activity',
        description: 'A chronological feed of all issue activity.',
    },
    {
        id: 'Timeline',
        icon: 'ChartGantt',
        description: 'Issues laid out on a horizontal timeline.',
    },
];
```

and the same `localStorage` validation guard as step 2 exists a
**second, independent time** in this file's `selectedLook` `useState`
initializer — update it too:

```ts
const [selectedLook, setSelectedLook] = useState<IssuePageLooks>(() => {
    const saved = localStorage.getItem('selectedLook');
    if (
        saved === 'List' ||
        saved === 'Board' ||
        saved === 'Calendar' ||
        saved === 'Activity' ||
        saved === 'Timeline'
    ) {
        return saved;
    }
    return 'List';
});
```

This file's copy is the one that actually calls
`localStorage.setItem('selectedLook', option.id)` when a card is
clicked — the Show.tsx guard from step 2 only *reads* it back on the
next project page visit.

## Step 5 — Add its preview to the settings card

File: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsIssueViewCard.tsx`

```tsx
function IssueViewPreview({ view }: { view: IssuePageLooks }) {
    if (view === 'Board') {
        return <BoardPreview />;
    }

    if (view === 'Calendar') {
        return <CalendarPreview />;
    }

    if (view === 'Activity') {
        return <ActivityPreview />;
    }

    if (view === 'Timeline') {
        return <TimelinePreview />;
    }

    return <ListPreview />;
}
```

Add a `TimelinePreview` component following the same shape as
`ListPreview`/`BoardPreview`/`CalendarPreview`/`ActivityPreview` in
this file (small, purely decorative fixed-content mockups — they don't
read real issue data, just render a few placeholder bars/blocks to
illustrate the layout; `ActivityPreview`'s three dots connected by a
timeline line is the closest existing reference for a non-tabular
view). Skipping this step doesn't break anything — the `if` chain's
final `return <ListPreview />` fallback means Timeline's settings card
would just silently show the List preview instead of its own.

## Tests

- `resources/js/Pages/Projects/Show.test.tsx` — add a case asserting
  `selectedLook === 'Timeline'` renders `TimelineView`, and a case for
  the `localStorage` guard accepting `'Timeline'`.
- `resources/js/Layouts/MainLayout.test.tsx` — add a case for the new
  view tab and its `'5'` shortcut, mirroring the existing
  `List`/`Board`/`Calendar`/`Activity` test cases exactly.
- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsPreferencesTab.test.tsx` —
  add a case selecting the Timeline card and asserting
  `localStorage.setItem` was called with `'Timeline'`.
- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsIssueViewCard.test.tsx` —
  add a case asserting `view="Timeline"` renders `TimelinePreview`,
  mirroring the existing `Activity`/`ActivityPreview` case.
- `resources/js/Components/Organisms/TimelineView/TimelineView.test.tsx`
  (new file) — whatever coverage matches the new component's actual
  behavior, following `CalendarView.test.tsx`'s shape as the closest
  existing reference.
