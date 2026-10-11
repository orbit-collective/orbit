# Register a component-scoped shortcut

Worked example: adding a `n` shortcut on the Projects index page that
opens the "new project" flow — scoped to that page, unlike `mod+k`
which should work everywhere (see
[`02-register-a-global-shortcut.md`](./02-register-a-global-shortcut.md)
for that shape instead). This mirrors `Sidebar.tsx`'s real `p` →
"Create project" shortcut exactly.

## The `key` string format

| Format | Example | Meaning |
|---|---|---|
| A single character | `'p'`, `'?'` | Pressed alone, with no modifier held |
| `modifier+key` | `'ctrl+k'`, `'alt+p'` | Held modifier + key, checked against the event's `ctrlKey`/`altKey`/`metaKey`/`shiftKey` flags |
| `mod+key` | `'mod+k'` | `mod` is `meta` (⌘) on macOS and `ctrl` elsewhere; help chips render `⌘` or `CTRL` to match. Prefer it over a hardcoded `ctrl+…` for app-wide shortcuts |
| Alt/Option combos | `'alt+p'` | Matched on the physical key (`event.code`), because Option on macOS changes `event.key` (`Option+P` → `π`) |
| Space-separated sequence | `'g p'` | Two non-modifier keys pressed within 500ms of each other (the "combo" tracked by `comboRef`) — the global navigation commands use it (`g d` Dashboard, `g p` Projects, `g s` Settings, `g n` Notifications); the longest run of recent keys wins, so `g p` beats the single-key `p` |

Always lowercase — `ShortcutContext` normalizes both the registered
`key` and the pressed combination to lowercase before comparing, so
`'Ctrl+K'` and `'ctrl+k'` behave identically, but write it lowercase
for consistency with every existing definition.

## One definition, several keys, and scopes

`key` may be an array — `key: ['?', '/']`, `key: ['c', 'ctrl+i']` — so
one action is one definition (and one row in the help modal) however
many bindings it has.

`scope?: 'global' | 'project' | 'issue'` (default `'global'`) decides
which definition wins when several share a key: the most specific
scope runs (`issue` > `project` > `global`), regardless of registration
order. A disabled definition is skipped, so the next scope down takes
over. Binding the same key twice **within the same scope** logs a
dev-only `console.warn` naming both descriptions.

Don't bind `ctrl+f`/`mod+f` — it is the browser's native Find.

## Step — Register the shortcut with `useShortcuts()`

File: `resources/js/Pages/Projects/Index.tsx`

```tsx
import { useShortcuts } from '@/context/ShortcutContext';
import { ShortcutDefinition } from '@/types/Shortcuts';
import { useMemo, useState } from 'react';

export default function ProjectsIndex({ projects }: ProjectsIndexProps) {
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

    const shortcuts = useMemo(
        (): ShortcutDefinition[] => [
            {
                key: 'n',
                description: 'New project',
                category: 'Creation',
                action: () => setIsNewProjectModalOpen(true),
            },
        ],
        [],
    );

    useShortcuts(shortcuts);

    // ...rest of the component...
}
```

`useMemo` here isn't optional decoration — `useShortcuts()`'s internal
`useEffect` re-registers (unregister the old array, register the new
one) whenever the `definitions` array reference changes, and a fresh
`[]` literal on every render would otherwise unregister/re-register on
every single render of the page. If the shortcut's `action` needs to
close over changing state, put that state in the `useMemo` dependency
array rather than dropping the memoization — see `Sidebar.tsx`'s own
`shortcuts` `useMemo` (empty deps, since its action only calls a
stable `setState` function) for the baseline shape to copy.

Registration/cleanup is automatic: `useShortcuts()` registers on mount
and unregisters on unmount (or whenever `definitions` changes) via its
own internal `useEffect` — there's no manual cleanup to write at the
call site, unlike calling `register()`/`registerBatch()` directly
(which guide 2 does, since it needs to run once at the provider level,
not per-component).

`category: 'Creation'` places it in the matching section of the help
modal, alongside every other `'Creation'`-categoried shortcut — pick
from the existing `ShortcutDefinition['category']` union
(`'Navigation' | 'Creation' | 'Search' | 'View' | 'Action'`) rather
than inventing a new one unless the shortcut genuinely doesn't fit any
existing category.

## Tests

- `resources/js/context/ShortcutContext.test.tsx` — no change needed
  for a new call site; it already covers `register()`/`useShortcuts()`
  generically, including the actual keydown-matching logic.
- Whichever test covers `Pages/Projects/Index.tsx` (create one if it
  doesn't exist) — don't simulate a real `keydown` event; mock
  `useShortcuts` instead and assert against the definitions array it
  was called with, exactly the pattern
  `resources/js/Components/Organisms/Sidebar/Sidebar.test.tsx`'s
  `'registers a "p" shortcut that opens the new project modal'` test
  already uses for its own shortcut:
  ```tsx
  const mockUseShortcuts = vi.hoisted(() => vi.fn());

  vi.mock('@/context/ShortcutContext', () => ({
      useShortcuts: mockUseShortcuts,
  }));

  test('registers an "n" shortcut that opens the new project modal', () => {
      render(<ProjectsIndex projects={[]} />);

      const shortcuts = mockUseShortcuts.mock.calls[0][0];
      const newProjectShortcut = shortcuts.find(
          (s: { key: string }) => s.key === 'n',
      );
      expect(newProjectShortcut).toBeDefined();

      act(() => {
          newProjectShortcut.action();
      });

      expect(screen.getByTestId('new-project-modal')).toBeInTheDocument();
  });
  ```
  This tests that the component registers the right definition and
  that its `action` does the right thing — it deliberately doesn't
  re-test `ShortcutContext`'s own key-matching/normalization logic,
  which `ShortcutContext.test.tsx` already owns.
