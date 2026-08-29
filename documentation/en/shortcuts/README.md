# Keyboard shortcuts

Every keyboard shortcut in Orbit — `?`/`/` for help, `ctrl+k`, `alt+p`,
a page-scoped `p` for "create project" — goes through one system:
`ShortcutContext`. There's no per-component `keydown` listener
anywhere in the app; a single global listener resolves every keypress
against a runtime-built registry, and the help modal (`?`) is
generated entirely from that same registry — there's no separate,
hand-maintained shortcuts-list to keep in sync.

## Guides, in the order you'd actually need them

1. **[Register a component-scoped shortcut](./01-register-a-component-scoped-shortcut.md)**
   — worked example adding a shortcut that only makes sense while a
   specific page/component is mounted, using the `useShortcuts()` hook
   the same way `Sidebar.tsx`'s `p` ("Create project") already does.
2. **[Register a global shortcut](./02-register-a-global-shortcut.md)**
   — worked example adding a shortcut that should exist everywhere in
   the app, registered directly inside `ShortcutProvider` the same way
   `ctrl+k`/`alt+p`/`alt+b` already are.

## The architecture in one paragraph

`ShortcutProvider` (`resources/js/context/ShortcutContext.tsx`) holds
one array of `ShortcutDefinition`s (`key`, `description`, `category`,
`action`, optional `disabled`) in state — nothing is hardcoded into
the keydown handler itself. `register()`/`registerBatch()` add to that
array and return an unregister function, meant to be called from a
`useEffect` cleanup (or, more commonly, through the `useShortcuts(definitions)`
hook, which does exactly that for you — pass an array, get the
context back, and registration/cleanup is handled on mount/unmount and
whenever the array reference changes). A single `window.addEventListener('keydown', ..., true)`
(capture phase, so it runs before a focused input could swallow the
event) builds a `pressedKey` string from the event's modifier flags
(`ctrl+`/`alt+`/`meta+`/`shift+` prefixes) and separately tracks a
"combo" of recent non-modifier keypresses within a 500ms window (for
multi-key sequences like `g p`, though nothing currently registers one
— see guide 1's key-format table), then looks for a `ShortcutDefinition`
whose `key` matches either form. Shortcuts are ignored entirely while
an `<input>`/`<textarea>`/`contenteditable` element has focus, except
`Escape`. The help modal (`ShortcutHelpModal`, opened by the
always-registered `?`/`/` shortcut) reads `shortcuts` from the same
context and groups/searches whatever's currently registered — it has
no knowledge of any shortcut beyond what's live in the array at the
moment it renders.
