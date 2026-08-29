# Dostosuj zachowanie alertów

`AlertProvider` nie ma żadnego limitu na to, ile alertów może się nagromadzić, i żadnej deduplikacji — każde wywołanie `addAlert()` dodaje kolejny element, kropka (zobacz `addAlert` w `resources/js/context/AlertContext.tsx`). To wystarcza dla tego, jak aplikacja z tego dziś korzysta (nic nie wywołuje alertów w ciasnej pętli), ale jeśli przyszła funkcja *może* wywołać kilka w szybkiej kolejności, warto ograniczyć stos zamiast pozwolić, żeby uzbierał się tuzin toastów. Przećwiczony przykład: ograniczenie widocznego stosu do 5, odrzucając najpierw najstarszy.

## Krok — Ogranicz stos w `addAlert`

Plik: `resources/js/context/AlertContext.tsx`

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

Własny `setTimeout` odrzuconego alertu i tak odpali się później i wywoła `removeAlert(id)` na id, którego już nie ma w `alerts` — nieszkodliwe, ponieważ `filter()` w `removeAlert` to no-op dla id, którego nie ma. Żadne czyszczenie oczekujących timeoutów nie jest potrzebne dla tej zmiany.

To jest ogólny kształt dla każdej zmiany zachowania tutaj: updater `setAlerts((prev) => ...)` w `addAlert` to jedyne miejsce posiadające listę, więc każda reguła stakowania/deduplikacji/priorytetu trafia tam, nie do `AlertContainer`/`Alert` (które pozostają głupimi renderatorami dowolnej listy, jaką dostaną) i nie do poszczególnych miejsc wywołania (komponent wywołujący `addAlert()` nie powinien musieć wiedzieć o globalnym limicie).

## Wariant deduplikacji, jeśli zamiast tego go potrzebujesz

Jeśli prawdziwym problemem jest ta *sama* wiadomość wywoływana wielokrotnie (a nie wiele różnych wiadomości), deduplikuj po wiadomości zamiast ograniczać po liczbie — zamień powyższe wywołanie `setAlerts` na:

```ts
setAlerts((prev) =>
    prev.some((alert) => alert.message === message)
        ? prev
        : [...prev, { id, message, type, actionUrl }],
);
```

Nie łącz tego z powyższym limitem bez przemyślenia interakcji — ograniczenie najpierw i deduplikacja później (albo odwrotnie) zmieniają, który alert przetrwa, gdy oba limity zostaną trafione jednocześnie.

## Testy

Plik: `resources/js/context/AlertContext.test.tsx`

Dodaj przypadek ćwiczący nowy limit bezpośrednio na hooku, w ten sam sposób co istniejące testy czasu trwania:

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

Użycie `duration: 0` utrzymuje każdy alert żywym (brak timera auto-usunięcia), więc licznik odzwierciedla tylko limit, nie wyścig z konfiguracją fake-timerów, jaką już instaluje `beforeEach` (`vi.useFakeTimers()`) — zobacz [`05-testing-components-that-use-alerts.md`](./05-testing-components-that-use-alerts.md) po to, dlaczego każdy test w tym pliku działa pod fake timers.
