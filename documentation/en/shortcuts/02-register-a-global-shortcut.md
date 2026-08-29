# Register a global shortcut

Worked example: adding `alt+d` as a global "Go to Dashboard" shortcut
alternative — wait, that one already exists as `alt+b`; the real
worked example here is adding `alt+i` for "Go to my Issues" (a page
that doesn't have a route yet, used purely to demonstrate the
registration shape) — a shortcut that should work from anywhere in the
app, not just one page, following the exact pattern `ctrl+k`/`alt+p`/
`alt+b`/`ctrl+f` already use.

## When this is the right shape, vs. guide 1

Register directly inside `ShortcutProvider` (this guide) only for a
shortcut that's genuinely global — navigation between top-level areas,
or an action meaningful regardless of what page is open (the help
modal itself, `ctrl+k`). Everything else — an action specific to one
page's content, like `Sidebar.tsx`'s `p` or a hypothetical per-issue
shortcut — belongs in that component via `useShortcuts()` instead (see
[`01-register-a-component-scoped-shortcut.md`](./01-register-a-component-scoped-shortcut.md)).
Registering something page-specific here would make it fire even on
pages where the action doesn't make sense.

## Step — Add it to the existing global `registerBatch()` call

File: `resources/js/context/ShortcutContext.tsx`

```tsx
useEffect(() => {
    return registerBatch([
        {
            key: 'alt+p',
            description: 'Go to Projects',
            category: 'Navigation',
            action: () => router.visit('/projects'),
        },
        {
            key: 'alt+b',
            description: 'Go to Dashboard',
            category: 'Navigation',
            action: () => router.visit('/'),
        },
        {
            key: 'alt+i',
            description: 'Go to my Issues',
            category: 'Navigation',
            action: () => router.visit('/issues/mine'),
        },
        {
            key: 'ctrl+f',
            description: 'Focus Search',
            category: 'Search',
            action: () => {
                const searchInput = document.querySelector(
                    'input[type="text"]',
                ) as HTMLInputElement;
                if (searchInput) searchInput.focus();
            },
        },
    ]);
}, [registerBatch]);
```

This is the **only** `useEffect` in `ShortcutProvider` that batches
multiple navigation shortcuts together — the help-modal (`?`/`/`) and
command-palette (`ctrl+k`) shortcuts each get their own dedicated
`useEffect`/`register()` call instead, purely because they were added
at different times, not because of any rule about which shape to use.
Either is fine for a new global shortcut; adding to the existing
`registerBatch()` array (shown above) is slightly less code for one
more navigation-style entry.

`router.visit(...)` (the Inertia client-side navigation call) is the
right primitive here, not `window.location.href = ...` — it keeps the
navigation inside Inertia's SPA-style routing instead of forcing a
full page reload.

## Tests

File: `resources/js/context/ShortcutContext.test.tsx`

Add a case right next to `'alt+p navigates to /projects via the
router'`/`'alt+b navigates to / via the router'`, following their
exact shape — dispatch a real keydown (through whatever
`dispatchKeydown()` helper the file already defines) rather than
calling `.action()` directly, since the point of this file is to
cover the actual key-matching logic too, not just that the definition
exists:

```tsx
test('alt+i navigates to /issues/mine via the router', () => {
    renderHook(() => useShortcuts(), { wrapper });

    act(() => {
        dispatchKeydown({ key: 'i', altKey: true });
    });

    expect(mockRouter.visit).toHaveBeenCalledWith('/issues/mine');
});
```

`mockRouter` here is the file's own hoisted `@inertiajs/react` mock
(`vi.mock('@inertiajs/react', () => ({ router: mockRouter }))`) —
reuse it as-is, don't add a second mock for the same module.
