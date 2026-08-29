# Zarejestruj skrót globalny

Przećwiczony przykład: dodanie `alt+i` jako globalnego skrótu "Go to my Issues" (strona, która jeszcze nie ma trasy, użyta czysto do zademonstrowania kształtu rejestracji) — skrót, który powinien działać z dowolnego miejsca w aplikacji, nie tylko jednej strony, na wzór dokładnie tego, jak już działają `ctrl+k`/`alt+p`/`alt+b`/`ctrl+f`.

## Kiedy to jest właściwy kształt, a kiedy przewodnik 1

Rejestruj bezpośrednio wewnątrz `ShortcutProvider` (ten przewodnik) tylko dla skrótu, który jest faktycznie globalny — nawigacja między obszarami najwyższego poziomu, albo akcja mająca sens niezależnie od tego, jaka strona jest otwarta (sam modal pomocy, `ctrl+k`). Wszystko inne — akcja specyficzna dla treści jednej strony, jak `p` w `Sidebar.tsx` albo hipotetyczny skrót per-issue — należy zamiast tego do tego komponentu przez `useShortcuts()` (zobacz [`01-register-a-component-scoped-shortcut.md`](./01-register-a-component-scoped-shortcut.md)). Zarejestrowanie tutaj czegoś specyficznego dla strony sprawiłoby, że wystrzeliwałby nawet na stronach, gdzie akcja nie ma sensu.

## Krok — Dodaj go do istniejącego globalnego wywołania `registerBatch()`

Plik: `resources/js/context/ShortcutContext.tsx`

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

To **jedyny** `useEffect` w `ShortcutProvider`, który grupuje razem wiele skrótów nawigacyjnych — skróty modalu pomocy (`?`/`/`) i palety komend (`ctrl+k`) mają zamiast tego każdy swoje dedykowane wywołanie `useEffect`/`register()`, czysto dlatego, że zostały dodane w różnym czasie, nie z powodu żadnej zasady o tym, jakiego kształtu użyć. Oba są w porządku dla nowego globalnego skrótu; dodanie do istniejącej tablicy `registerBatch()` (pokazane powyżej) to nieco mniej kodu dla jeszcze jednego wpisu w stylu nawigacyjnym.

`router.visit(...)` (kliencka nawigacja Inertii) to właściwy prymityw tutaj, nie `window.location.href = ...` — trzyma nawigację wewnątrz routingu Inertii w stylu SPA zamiast wymuszać pełne przeładowanie strony.

## Testy

Plik: `resources/js/context/ShortcutContext.test.tsx`

Dodaj przypadek tuż obok `'alt+p navigates to /projects via the router'`/`'alt+b navigates to / via the router'`, na wzór ich dokładnego kształtu — wystrzel prawdziwy keydown (przez jakikolwiek helper `dispatchKeydown()`, jaki plik już definiuje) zamiast wywoływać `.action()` bezpośrednio, ponieważ celem tego pliku jest pokrycie też faktycznej logiki dopasowania klucza, nie tylko tego, że definicja istnieje:

```tsx
test('alt+i navigates to /issues/mine via the router', () => {
    renderHook(() => useShortcuts(), { wrapper });

    act(() => {
        dispatchKeydown({ key: 'i', altKey: true });
    });

    expect(mockRouter.visit).toHaveBeenCalledWith('/issues/mine');
});
```

`mockRouter` tutaj to własny hoistowany mock pliku dla `@inertiajs/react` (`vi.mock('@inertiajs/react', () => ({ router: mockRouter }))`) — użyj go ponownie tak jak jest, nie dodawaj drugiego mocka dla tego samego modułu.
