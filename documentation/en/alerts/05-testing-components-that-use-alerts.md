# Testing components that use alerts

Two different test shapes exist in this codebase already, depending on
whether you're testing `AlertContext` itself vs. a component that
merely *consumes* it. Use the right one — they solve different
problems.

## Testing `AlertContext`/`useAlert()` directly

File: `resources/js/context/AlertContext.test.tsx`

Uses `renderHook` (from `@testing-library/react`) against `useAlert()`
directly, with `@inertiajs/react` mocked entirely (both `usePage` and
`router.on`, the latter recording registered handlers so the test can
fire a fake "success" visit) and `AlertContainer` mocked out to a
no-op — this test file is about the *state machine*, not the rendered
DOM:

```ts
const pageState = vi.hoisted(() => ({
    flash: {} as Record<string, string | undefined>,
    successHandlers: [] as Array<(event: unknown) => void>,
}));

const fireRouterSuccess = (flash: Record<string, string | undefined>) => {
    pageState.successHandlers.forEach((handler) =>
        handler({ detail: { page: { props: { flash } } } }),
    );
};

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { flash: pageState.flash } }),
    router: {
        on: (event: string, handler: (e: unknown) => void) => {
            if (event === 'success') {
                pageState.successHandlers.push(handler);
            }
            return () => {
                pageState.successHandlers = pageState.successHandlers.filter(
                    (h) => h !== handler,
                );
            };
        },
    },
}));

vi.mock('@/Components/Organisms/AlertContainer/AlertContainer', () => ({
    AlertContainer: () => null,
}));

import { AlertProvider, useAlert } from './AlertContext';

const wrapper = ({ children }: { children: ReactNode }) => (
    <AlertProvider>{children}</AlertProvider>
);

beforeEach(() => {
    pageState.flash = {};
    pageState.successHandlers = [];
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});
```

`vi.useFakeTimers()` in every test here is required, not incidental —
`addAlert`'s auto-removal is a real `setTimeout`; without fake timers,
a test asserting "auto-removes after 4000ms" would need to actually
wait 4 seconds (or worse, flake under load). Use `vi.advanceTimersByTime(ms)`
to fast-forward, exactly as
[`04-customize-alert-behavior.md`](./04-customize-alert-behavior.md)'s
own test does.

Only extend this file for genuinely new `AlertContext` **behavior**
(a new flash key, a new stacking rule) — not for testing a component
that happens to call `addAlert()`.

## Testing a component that calls `useAlert()`

File: any component test alongside a component using `useAlert()` —
e.g.
`resources/js/Components/Organisms/IssuePageHeader/IssuePageHeader.test.tsx`
(see
[`02-trigger-an-alert-from-the-frontend.md`](./02-trigger-an-alert-from-the-frontend.md))
or
`resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsNotificationsTab.test.tsx`.

Don't mock `@/context/AlertContext` here — wrap the component in the
**real** `AlertProvider` instead, and assert on the alert actually
appearing in the DOM:

```tsx
import { AlertProvider } from '@/context/AlertContext';

render(
    <AlertProvider>
        <YourComponent />
    </AlertProvider>,
);

// ...trigger the action...

expect(await screen.findByText('Your expected message')).toBeInTheDocument();
```

Use `findByText` (async, retries), not `getByText` — `addAlert`
triggers a state update that needs a tick to flush, and there's no
`act()` wrapping already provided the way there is inside
`renderHook`. Mocking `useAlert()` to a `vi.fn()` instead is tempting
but weaker: it only proves your component *called* `addAlert` with
some arguments, not that a real user would actually see the resulting
toast — prefer the real-provider approach unless the component under
test has nothing to do with what the alert says (e.g. a test that's
purely about a different concern and just happens to trigger one
incidentally).

There's no shared test-utils `render()` wrapper that already includes
`AlertProvider` today (`resources/js/tests/setup.ts` only configures
the jsdom environment/globals) — every component test that needs it
wraps manually, as shown above.

## Tests

This guide is itself about tests — there's nothing further to add.
