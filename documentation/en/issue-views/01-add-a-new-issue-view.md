# Add a new issue view

Worked example: adding a fourth view, **Timeline**. Six places need
it — miss one and the new view either can't be reached, has no
shortcut, isn't offered as a default, or renders a broken preview,
depending on which.

## Step 1 — Widen the type

File: `resources/js/types/Issues.ts`

```ts
export type IssuePageLooks = 'List' | 'Board' | 'Calendar' | 'Timeline';
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
) : (
    <TimelineView issues={issues.data} />
)}
```

Every existing view takes the same `issues.data` array and presents it
differently — a new view is a new component consuming that same prop,
not a new data-fetching path. Add
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

## Step 3 — Add the nav button and its shortcut

File: `resources/js/Components/Organisms/TopNav/TopNav.tsx`

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
            description: 'Timeline view',
            category: 'View',
            action: () => setSelectedLook('Timeline'),
        },
    ],
    [setSelectedLook],
);
```

then a matching `<button>` in the `<nav>` block, copying the exact
shape of the `List`/`Board`/`Calendar` buttons (`buttonVariants({
isActive: selectedLook === 'Timeline' })`, an `Icon`, the label) — see
[`../shortcuts/02-register-a-global-shortcut.md`](../shortcuts/02-register-a-global-shortcut.md)
for the general shape of adding a shortcut like this one, though this
one is scoped to the project page rather than truly global.

## Step 4 — Add it as a default-view option in Account settings

File: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsPreferencesTab.tsx`

```ts
const issueViewOptions: Array<{
    id: IssuePageLooks;
    icon: 'Rows3' | 'Columns3' | 'CalendarDays' | 'ChartGantt';
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

    if (view === 'Timeline') {
        return <TimelinePreview />;
    }

    return <ListPreview />;
}
```

Add a `TimelinePreview` component following the same shape as
`ListPreview`/`BoardPreview`/`CalendarPreview` in this file (small,
purely decorative fixed-content mockups — they don't read real issue
data, just render a few placeholder bars/blocks to illustrate the
layout). Skipping this step doesn't break anything — the `if` chain's
final `return <ListPreview />` fallback means Timeline's settings card
would just silently show the List preview instead of its own.

## Tests

- `resources/js/Pages/Projects/Show.test.tsx` (or wherever this page's
  rendering is covered) — add a case asserting `selectedLook ===
  'Timeline'` renders `TimelineView`, and a case for the
  `localStorage` guard accepting `'Timeline'`.
- `resources/js/Components/Organisms/TopNav/TopNav.test.tsx` — add a
  case for the new nav button and its `'4'` shortcut, mirroring the
  existing `List`/`Board`/`Calendar` test cases exactly (see the
  file's existing `selectedLook: 'Board'`/`'Calendar'` test fixtures).
- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsPreferencesTab.test.tsx` —
  add a case selecting the Timeline card and asserting
  `localStorage.setItem` was called with `'Timeline'`.
- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsIssueViewCard.test.tsx` —
  add a case asserting `view="Timeline"` renders `TimelinePreview`.
- `resources/js/Components/Organisms/TimelineView/TimelineView.test.tsx`
  (new file) — whatever coverage matches the new component's actual
  behavior, following `CalendarView.test.tsx`'s shape as the closest
  existing reference.
