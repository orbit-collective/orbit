# Zarejestruj skrót zakresu komponentu

Przećwiczony przykład: dodanie skrótu `n` na stronie listy projektów, który otwiera przepływ "nowy projekt" — scope'owany do tej strony, w przeciwieństwie do `ctrl+k`, który powinien działać wszędzie (zobacz [`02-register-a-global-shortcut.md`](./02-register-a-global-shortcut.md) po ten kształt zamiast tego). To odzwierciedla dokładnie prawdziwy skrót `p` → "Create project" w `Sidebar.tsx`.

## Format stringa `key`

| Format | Przykład | Znaczenie |
|---|---|---|
| Pojedynczy znak | `'p'`, `'?'` | Naciśnięty samodzielnie, bez trzymanego modyfikatora |
| `modyfikator+klawisz` | `'ctrl+k'`, `'alt+p'` | Trzymany modyfikator + klawisz, sprawdzany względem flag eventu `ctrlKey`/`altKey`/`metaKey`/`shiftKey` |
| Sekwencja rozdzielona spacją | `'g p'` | Dwa klawisze bez modyfikatora naciśnięte w ciągu 500ms od siebie (śledzone "combo" przez `comboRef`) — żaden skrót w kodzie faktycznie tego dziś nie używa, ale logika dopasowania już to wspiera |

Zawsze małymi literami — `ShortcutContext` normalizuje zarówno zarejestrowany `key`, jak i naciśniętą kombinację do małych liter przed porównaniem, więc `'Ctrl+K'` i `'ctrl+k'` zachowują się identycznie, ale zapisz go małymi literami dla spójności z każdą istniejącą definicją.

## Krok — Zarejestruj skrót przez `useShortcuts()`

Plik: `resources/js/Pages/Projects/Index.tsx`

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

`useMemo` tutaj to nie opcjonalna dekoracja — wewnętrzny `useEffect` `useShortcuts()` ponownie rejestruje (wyrejestruj starą tablicę, zarejestruj nową) za każdym razem, gdy zmienia się referencja tablicy `definitions`, a świeży literał `[]` przy każdym renderze inaczej wyrejestrowywałby/rejestrował ponownie przy każdym pojedynczym renderze strony. Jeśli `action` skrótu musi domykać się nad zmieniającym się stanem, umieść ten stan w tablicy zależności `useMemo` zamiast rezygnować z memoizacji — zobacz własny `useMemo` `shortcuts` w `Sidebar.tsx` (puste deps, ponieważ jego akcja wywołuje tylko stabilną funkcję `setState`) po bazowy kształt do skopiowania.

Rejestracja/czyszczenie są automatyczne: `useShortcuts()` rejestruje przy montowaniu i wyrejestrowuje przy odmontowaniu (albo za każdym razem, gdy zmienia się `definitions`) przez własny wewnętrzny `useEffect` — nie ma żadnego ręcznego czyszczenia do napisania w miejscu wywołania, w przeciwieństwie do wywoływania `register()`/`registerBatch()` bezpośrednio (co robi przewodnik 2, ponieważ musi uruchomić się raz na poziomie providera, nie per komponent).

`category: 'Creation'` umieszcza go w pasującej sekcji modalu pomocy, obok każdego innego skrótu z kategorią `'Creation'` — wybierz z istniejącej unii `ShortcutDefinition['category']` (`'Navigation' | 'Creation' | 'Search' | 'View' | 'Action'`) zamiast wymyślać nową, chyba że skrót faktycznie nie pasuje do żadnej istniejącej kategorii.

## Testy

- `resources/js/context/ShortcutContext.test.tsx` — żadna zmiana nie jest potrzebna dla nowego miejsca wywołania; już pokrywa `register()`/`useShortcuts()` generycznie, włącznie z faktyczną logiką dopasowania keydown.
- Dowolny test pokrywający `Pages/Projects/Index.tsx` (stwórz, jeśli nie istnieje) — nie symuluj prawdziwego eventu `keydown`; zamockuj zamiast tego `useShortcuts` i asercuj względem tablicy definicji, z jaką został wywołany, dokładnie ten wzorzec, jakiego już używa test `'registers a "p" shortcut that opens the new project modal'` w `resources/js/Components/Organisms/Sidebar/Sidebar.test.tsx` dla własnego skrótu:
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
  To testuje, że komponent rejestruje właściwą definicję i że jego `action` robi właściwą rzecz — celowo nie testuje ponownie własnej logiki dopasowania/normalizacji klucza `ShortcutContext`, którą już posiada `ShortcutContext.test.tsx`.
