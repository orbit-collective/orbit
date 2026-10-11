# Dodaj komendę globalną

Przećwiczony przykład: komenda "Go to my Issues" (strona użyta czysto do zademonstrowania kształtu), dostępna z palety i z klawiatury jako `g i`, na każdej stronie.

## Kiedy to jest właściwy kształt

Dodawaj do `useGlobalCommands` (ten przewodnik) tylko coś, co jest faktycznie globalne — nawigację między obszarami najwyższego poziomu, preferencje, konto, pomoc. Komenda, która potrzebuje danych mających tylko jedną stronę (widoki projektu, pola issue), należy do tej strony: zobacz [wariant na poziomie strony poniżej](#komenda-należąca-do-jednego-komponentu) i [przewodnik 2](./02-add-a-contextual-command-with-nested-steps.md).

## Krok — Dodaj komendę

Plik: `resources/js/hooks/useGlobalCommands.ts`

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

| Pole | Znaczenie |
|---|---|
| `id` | Stabilne i unikalne. To je przyjmuje `runCommand('nav.issues')`, więc przycisk może uruchomić komendę, nie znając jej keybindingu. |
| `title` | Tekst wiersza; wyszukiwanie fuzzy go podświetla. |
| `subtitle` | Opcjonalny przyciszony tekst meta po tytule. |
| `group` | `navigation`, `creation`, `preferences`, `account` lub `help` (także `suggested`, `recent`, `issues`, `projects`, `people`, które paleta wypełnia sama). Kolejność na ekranie to `COMMAND_GROUP_ORDER` w `types/Commands.ts`. |
| `icon` | Dowolny klucz z `icons` lucide (typ to wymusza). |
| `keywords` | Dodatkowe słowa, które wyszukiwanie dopasowuje, ale nigdy nie podświetla. |
| `shortcut` | Opcjonalny. String (`'alt+i'`, `'mod+k'`, sekwencja jak `'g i'`) albo tablica dla kilku bindingów. Jest rejestrowany w silniku skrótów, dopóki komenda jest zarejestrowana, i pokazywany jako chip. |
| `category` | W której sekcji skrót trafia w widoku pomocy; domyślnie z `group`. |
| `scope` | `'project'` lub `'issue'` sprawia, że skrót wygrywa z globalnym o tym samym klawiszu. |
| `when` | Zwróć `false`, żeby ukryć komendę **i** wyłączyć jej skrót. |
| `perform` | Co się dzieje. Paleta zamyka się najpierw, chyba że ustawiono `keepOpen`. |

Do nawigacji użyj `router.visit(...)` (Inertia), nigdy `window.location.href`: zostawia nawigację w routingu Inertii w stylu SPA.

Sekwencje (`g i`) nie wymagają dodatkowej konfiguracji. Silnik dopasowuje najdłuższy ciąg ostatnich klawiszy, więc `g p` ("Go to Projects") wygrywa z jednoklawiszowym `p` ("Create project"), a gdy fokus ma input, są ignorowane.

## Komenda należąca do jednego komponentu

Gdy komenda potrzebuje własnego stanu komponentu (sidebar otwiera swój modal "nowy projekt"), zarejestruj ją z tego komponentu przez `useCommands` i **zmemoizuj tablicę**:

Plik: `resources/js/Components/Organisms/Sidebar/Sidebar.tsx`

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

Istnieje dokładnie tak długo, jak komponent jest zamontowany. Przycisk gdzie indziej może ją uruchomić po id przez `useCommandPalette().runCommand('project.create')` — preferuj to nad zdeprecjonowane `triggerShortcut('p')`, które wiąże przycisk z keybindingiem.

## Testy

Plik: `resources/js/hooks/useGlobalCommands.test.ts`

Plik mockuje `useCommands` i odczytuje to, co zarejestrował hook:

```ts
test('go to my issues has its own shortcut and visits the page', () => {
    render();

    expect(byId('nav.issues').shortcut).toBe('g i');

    byId('nav.issues').perform?.();
    expect(mocks.router.visit).toHaveBeenCalledWith('/issues/mine');
});
```

Ścieżka keydown → akcja, sekwencje i `mod` są pokryte raz w `CommandContext.test.tsx` i `ShortcutContext.test.tsx`; nowa komenda ich nie powtarza.
