# Add a dropdown

Worked example: choosing which `Dropdown` variant to reach for, and how
to wire each one. Never hand-build a floating panel — a new dropdown
should look and behave exactly like the existing ones.

## Pick a variant

| You need… | Variant |
| --- | --- |
| Pick exactly one value | `select` |
| Toggle several values | `multiselect` |
| A list of actions (no selection state) | `menu` |
| Your own content in the same surface (forms, summaries) | `panel` |

The `trigger` is any element — a `FilterButton`, an avatar button, a
pill. `Dropdown` makes it open the panel and adds the ARIA attributes;
pass a function (`({ isOpen }) => …`) if the trigger changes while open.

## Single select

```tsx
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';

<Dropdown
    variant="select"
    title="Priority"
    options={[
        { value: 'high', label: 'High' },
        { value: 'low', label: 'Low' },
    ]}
    selectedValues={[priority]}
    onSelect={(value) => setPriority(value)}
    trigger={<button type="button">{priority}</button>}
/>
```

The search box appears by itself once there are more than six options
(`searchable="auto"`); force it with `searchable` or hide it with
`searchable={false}`. For rich labels (avatars, badges) set
`searchLabel` so search still has text to match. Add `onClear` to show
a "Clear" action while something is selected.

## Multiselect

```tsx
<Dropdown
    variant="multiselect"
    title="Labels"
    showCount
    options={labels}
    selectedValues={selectedLabels}
    onSelect={toggleLabel}
    onClear={() => setSelectedLabels([])}
    onSelectAll={toggleAll}
    trigger={<FilterButton label="Labels" hasMenu />}
/>
```

It stays open between picks. `onSelectAll` adds the "Select all"
footer; `showCount` adds the "N results" line the filters use.

## Menu

```tsx
<Dropdown
    variant="menu"
    placement="top"
    options={[
        { value: 'settings', label: 'Settings', icon: 'Settings' },
        { value: 'logout', label: 'Log out', icon: 'LogOut', tone: 'danger' },
    ]}
    onSelect={(action) => handle(action)}
    trigger={<button type="button">Account</button>}
/>
```

Rows have no selection indicator. For a menu that mixes sections, use
`kind: 'heading'` / `kind: 'separator'` rows and per-option `role`
(`menuitemradio`, `menuitemcheckbox`), `indicator: 'check'` and
`closeOnSelect: false` — see `MemberRoleDropdown`.

## Panel

```tsx
<Dropdown variant="panel" ariaLabel="Saved views" width={288} trigger={…}>
    {({ close }) => <MyForm onDone={close} />}
</Dropdown>
```

You get the surface, positioning and Escape / outside-click handling;
the content is yours. Tab doesn't close a panel, so forms keep working.

## Controlled state and special anchors

- `open` + `onOpenChange` hand the open state to the parent (the filter
  bar closes one dropdown when another opens).
- `anchorPoint={{ x, y }}` opens it at a point instead of at the
  trigger — `ListRow` uses it for the right-click context menu.
- `align="end"`, `placement="top"` and `width` (a number, or `'trigger'`)
  tune the panel; it flips above the trigger and stays inside the viewport.

## Behaviors worth knowing

- Clicks inside the panel and on the trigger don't propagate to
  clickable ancestors (a row, a card), even though the panel is portaled.
- ArrowUp/Down, Home/End move between rows, Escape closes and returns
  focus to the trigger, and Tab closes the list and moves on.
- The panel renders above modals (`z-[9999]`).

## Test it

- `resources/js/Components/Molecules/Dropdown/Dropdown.test.tsx` covers
  every variant; add a case there when you extend `Dropdown` itself.
- In a wrapper's tests, query rows by role: `option` for `select` /
  `multiselect`, `menuitem` / `menuitemradio` / `menuitemcheckbox` for `menu`.
