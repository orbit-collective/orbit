# Add a global command

Worked example: a "Go to my Issues" command (a page used purely to
demonstrate the shape) that is reachable from the palette and from the
keyboard as `g i`, on every page.

## When this is the right shape

Add it to `useGlobalCommands` only for something genuinely global —
navigation between top-level areas, preferences, account, help. A
command that needs data only one page has (a project's views, an
issue's fields) belongs to that page: see
[the page-level variant below](#a-command-owned-by-one-component) and
[guide 2](./02-add-a-contextual-command-with-nested-steps.md).

## Step — Add the command

File: `resources/js/hooks/useGlobalCommands.ts`

```ts
{
    id: 'nav.issues',
    title: 'Go to my Issues',
    group: 'navigation',
    icon: 'ListChecks',
    shortcut: 'g i',
    category: 'Navigation',
    keywords: ['assigned', 'mine'],
    perform: () => router.visit('/issues/mine'),
},
```

| Field | Meaning |
|---|---|
| `id` | Stable and unique. This is what `runCommand('nav.issues')` takes, so a button can run a command without knowing its keybinding. |
| `title` | The row text; the fuzzy search highlights it. |
| `subtitle` | Optional muted meta text after the title. |
| `group` | `navigation`, `creation`, `preferences`, `account` or `help` (also `suggested`, `recent`, `issues`, `projects`, `people`, which the palette fills itself). The on-screen order is `COMMAND_GROUP_ORDER` in `types/Commands.ts`. |
| `icon` | Any key of lucide's `icons` (the type enforces it). |
| `keywords` | Extra words the search matches but never highlights. |
| `shortcut` | Optional. A string (`'alt+i'`, `'mod+k'`, a sequence like `'g i'`) or an array for several bindings. It is registered with the shortcut engine while the command is registered, and shown as a chip. |
| `category` | Which section the shortcut gets in the help view; defaults from `group`. |
| `scope` | `'project'` or `'issue'` makes the shortcut win over a global one with the same key. |
| `when` | Return `false` to hide the command **and** disable its shortcut. |
| `perform` | What happens. The palette closes first unless `keepOpen` is set. |

Use `router.visit(...)` (Inertia) for navigation, never
`window.location.href`: it keeps the navigation inside Inertia's
SPA-style routing.

Sequences (`g i`) need no extra setup. The engine matches the longest
run of recent keys, so `g p` ("Go to Projects") wins over the single-key
`p` ("Create project"), and it is ignored while an input has focus.

## A command owned by one component

When the command needs the component's own state (the sidebar opens
its "new project" modal), register it from that component with
`useCommands`, and **memoize the array**:

File: `resources/js/Components/Organisms/Sidebar/Sidebar.tsx`

```tsx
const commands = useMemo(
    (): Command[] => [
        {
            id: 'project.create',
            title: 'Create project',
            group: 'creation',
            icon: 'FolderPlus',
            shortcut: 'p',
            keywords: ['new project'],
            perform: () => setIsNewProjectModalOpen(true),
        },
    ],
    [],
);

useCommands(commands);
```

It exists exactly while the component is mounted. A button elsewhere
can run it by id with `useCommandPalette().runCommand('project.create')`
— prefer that over the deprecated `triggerShortcut('p')`, which couples a
button to a keybinding.

## Tests

File: `resources/js/hooks/useGlobalCommands.test.ts`

The file mocks `useCommands` and reads back what the hook registered:

```ts
test('go to my issues has its own shortcut and visits the page', () => {
    render();

    expect(byId('nav.issues').shortcut).toBe('g i');

    byId('nav.issues').perform?.();
    expect(mocks.router.visit).toHaveBeenCalledWith('/issues/mine');
});
```

The keydown → action path, sequences and `mod` are covered once in
`CommandContext.test.tsx` and `ShortcutContext.test.tsx`; a new command
does not repeat them.
