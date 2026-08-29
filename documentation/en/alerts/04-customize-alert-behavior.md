# Customize alert behavior

`AlertProvider` has no limit on how many alerts can stack up, and no
deduplication — every `addAlert()` call adds one more item, full stop
(see `resources/js/context/AlertContext.tsx`'s `addAlert`). That's
fine for how the app uses it today (nothing fires alerts in a tight
loop), but if a future feature *can* trigger several in quick
succession, it's worth capping the stack rather than letting a dozen
toasts pile up. Worked example: capping the visible stack at 5,
dropping the oldest first.

## Step — Cap the stack in `addAlert`

File: `resources/js/context/AlertContext.tsx`

```ts
const MAX_VISIBLE_ALERTS = 5;

export const AlertProvider = ({ children }: { children: ReactNode }) => {
    const [alerts, setAlerts] = useState<AlertItem[]>([]);

    const addAlert = useCallback(
        (
            message: string,
            type: AlertType = 'success',
            duration = 4000,
            actionUrl?: string,
        ) => {
            const id = Math.random().toString(36).substring(2, 9);

            setAlerts((prev) => {
                const next = [...prev, { id, message, type, actionUrl }];
                return next.length > MAX_VISIBLE_ALERTS
                    ? next.slice(next.length - MAX_VISIBLE_ALERTS)
                    : next;
            });

            if (duration) {
                setTimeout(() => {
                    removeAlert(id);
                }, duration);
            }
        },
        [],
    );

    // ... removeAlert, showFlashAlerts, and both useEffects are unchanged
```

The dropped alert's own `setTimeout` still fires later and calls
`removeAlert(id)` on an id no longer in `alerts` — harmless, since
`removeAlert`'s `filter()` is a no-op for an id that isn't present.
No cleanup of pending timeouts is needed for this change.

This is the general shape for any behavior change here: `addAlert`'s
`setAlerts((prev) => ...)` updater is the one place that owns the
list, so every stacking/dedup/priority rule goes there, not in
`AlertContainer`/`Alert` (which stay dumb renderers of whatever list
they're given) and not in individual call sites (a component calling
`addAlert()` shouldn't need to know about a global cap).

## A dedup variant, if you need it instead

If the actual problem is the *same* message firing repeatedly (rather
than many different messages), dedupe by message instead of capping
by count — replace the `setAlerts` call above with:

```ts
setAlerts((prev) =>
    prev.some((alert) => alert.message === message)
        ? prev
        : [...prev, { id, message, type, actionUrl }],
);
```

Don't combine this with the cap above without thinking through the
interaction — capping first and deduping second (or vice versa) change
which alert survives when both limits are hit simultaneously.

## Tests

File: `resources/js/context/AlertContext.test.tsx`

Add a case exercising the new limit directly against the hook, the
same way the existing duration tests do:

```ts
test('drops the oldest alert once more than 5 are visible', () => {
    const { result } = renderHook(() => useAlert(), { wrapper });

    act(() => {
        for (let i = 1; i <= 6; i += 1) {
            result.current.addAlert(`Alert ${i}`, 'success', 0);
        }
    });

    expect(result.current.alerts).toHaveLength(5);
    expect(result.current.alerts[0].message).toBe('Alert 2');
    expect(result.current.alerts.at(-1)?.message).toBe('Alert 6');
});
```

Using `duration: 0` keeps every alert alive (no auto-removal timer) so
the count reflects only the cap, not a race with the fake-timer setup
`beforeEach` already installs (`vi.useFakeTimers()`) — see
[`05-testing-components-that-use-alerts.md`](./05-testing-components-that-use-alerts.md)
for why every test in this file runs under fake timers.
