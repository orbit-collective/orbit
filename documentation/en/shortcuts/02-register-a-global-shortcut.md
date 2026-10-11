# Register a global shortcut

Worked example: adding `alt+i` for "Go to my Issues" (a page that
doesn't have a route yet, used purely to demonstrate the registration
shape) — a shortcut that should work from anywhere in the app, not
just one page.

Global shortcuts are **commands**. Since the command palette landed,
`ShortcutProvider` registers no shortcuts of its own: every app-wide
shortcut (`alt+b`, `alt+p`, `?`, `mod+k`, `/`) is declared as an
attribute of a command, and the palette registers the keybinding for
you. That keeps the palette entry, its shortcut chip and the help view
in sync from one definition.

## When this is the right shape, vs. guide 1

Add it to `useGlobalCommands` (this guide) only for something that is
genuinely global — navigation between top-level areas, or an action
meaningful regardless of what page is open. An action specific to one
page's content, like `Sidebar.tsx`'s `p` or a per-issue action, belongs
in that component via `useCommands()` with a `shortcut` (or
`useShortcuts()` for a shortcut with no palette entry; see
[`01-register-a-component-scoped-shortcut.md`](./01-register-a-component-scoped-shortcut.md)).
Registering something page-specific globally would make it fire on
pages where the action doesn't make sense.

## Step — Add a command with a `shortcut`

File: `resources/js/hooks/useGlobalCommands.ts`

```tsx
{
    id: 'nav.issues',
    title: 'Go to my Issues',
    group: 'navigation',
    icon: 'ListChecks',
    shortcut: 'alt+i',
    category: 'Navigation',
    perform: () => router.visit('/issues/mine'),
},
```

`shortcut` takes everything `ShortcutDefinition.key` does: `'alt+i'`,
`'mod+k'`, an array (`['c', 'ctrl+i']`) or a sequence (`'g i'`). Add
`scope: 'project' | 'issue'` for a shortcut that should win over a
global one with the same key. `when()` hides the command and disables
its shortcut together.

`router.visit(...)` (the Inertia client-side navigation call) is the
right primitive here, not `window.location.href = ...` — it keeps the
navigation inside Inertia's SPA-style routing instead of forcing a
full page reload.

## Tests

File: `resources/js/hooks/useGlobalCommands.test.ts`

The file mocks `useCommands` and reads back the commands the hook
registered, so assert the command and run its `perform()`:

```tsx
test('go to my issues has its own shortcut and visits the page', () => {
    render();

    expect(byId('nav.issues').shortcut).toBe('alt+i');

    byId('nav.issues').perform?.();
    expect(mocks.router.visit).toHaveBeenCalledWith('/issues/mine');
});
```

The keydown-to-action path itself (including `mod`, Alt via
`event.code`, scopes) is covered once in
`resources/js/context/CommandContext.test.tsx` and
`resources/js/context/ShortcutContext.test.tsx`; a new command does
not need to repeat it.
