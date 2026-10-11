# Zarejestruj skrót globalny

Przećwiczony przykład: dodanie `alt+i` dla "Go to my Issues" (strona, która jeszcze nie ma trasy, użyta czysto do zademonstrowania kształtu rejestracji) — skrót, który powinien działać z dowolnego miejsca w aplikacji, nie tylko jednej strony.

Skróty globalne to **komendy**. Od czasu palety komend `ShortcutProvider` nie rejestruje własnych skrótów: każdy skrót obejmujący całą aplikację (`alt+b`, `alt+p`, `?`, `mod+k`, `/`) jest zadeklarowany jako atrybut komendy, a paleta sama rejestruje keybinding. Dzięki temu wpis w palecie, jego chip ze skrótem i widok pomocy są zsynchronizowane z jednej definicji.

## Kiedy to jest właściwy kształt, a kiedy przewodnik 1

Dodawaj do `useGlobalCommands` (ten przewodnik) tylko coś, co jest faktycznie globalne — nawigację między obszarami najwyższego poziomu albo akcję mającą sens niezależnie od tego, jaka strona jest otwarta. Akcja specyficzna dla treści jednej strony, jak `p` w `Sidebar.tsx` albo akcja per-issue, należy do tego komponentu przez `useCommands()` ze `shortcut` (albo `useShortcuts()` dla skrótu bez wpisu w palecie; zobacz [`01-register-a-component-scoped-shortcut.md`](./01-register-a-component-scoped-shortcut.md)). Zarejestrowanie czegoś specyficznego dla strony globalnie sprawiłoby, że wystrzeliwałoby na stronach, gdzie akcja nie ma sensu.

## Krok — Dodaj komendę ze `shortcut`

Plik: `resources/js/hooks/useGlobalCommands.ts`

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

`shortcut` przyjmuje wszystko, co `ShortcutDefinition.key`: `'alt+i'`, `'mod+k'`, tablicę (`['c', 'ctrl+i']`) albo sekwencję (`'g i'`). Dodaj `scope: 'project' | 'issue'` dla skrótu, który ma wygrywać z globalnym o tym samym klawiszu. `when()` ukrywa komendę i wyłącza jej skrót jednocześnie.

`router.visit(...)` (wywołanie nawigacji po stronie klienta Inertii) to tu właściwy prymityw, nie `window.location.href = ...` — zostawia nawigację w routingu Inertii w stylu SPA zamiast wymuszać pełne przeładowanie strony.

## Testy

Plik: `resources/js/hooks/useGlobalCommands.test.ts`

Plik mockuje `useCommands` i odczytuje komendy zarejestrowane przez hook, więc asertuj komendę i uruchom jej `perform()`:

```tsx
test('go to my issues has its own shortcut and visits the page', () => {
    render();

    expect(byId('nav.issues').shortcut).toBe('alt+i');

    byId('nav.issues').perform?.();
    expect(mocks.router.visit).toHaveBeenCalledWith('/issues/mine');
});
```

Sama ścieżka keydown → akcja (w tym `mod`, Alt przez `event.code`, scope'y) jest pokryta raz w `resources/js/context/CommandContext.test.tsx` i `resources/js/context/ShortcutContext.test.tsx`; nowa komenda nie musi jej powtarzać.
