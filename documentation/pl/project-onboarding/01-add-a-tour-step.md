# Dodaj krok wycieczki

Przećwiczony przykład: dodanie kroku o przycisku "Refresh" do interaktywnej wycieczki po produkcie, którą każde nowe konto widzi raz.

Wycieczka to podświetlenie elementu + przypięty popup (wstecz / dalej / zamknij), który sam przechodzi między stronami. Kroki to zwykłe dane w `resources/js/types/Tour.ts`; elementy, na które wskazują, są oznaczone atrybutem `data-tour`.

## Krok 1 — Oznacz element

Dodaj `data-tour="<id>"` do elementu, który ma być podświetlony. Dla `NavItem` w sidebarze przekaż zamiast tego prop `tourId`, który renderuje ten atrybut.

Plik: `resources/js/Components/Organisms/PageHeader/PageHeader.tsx`

```tsx
<button
    onClick={handleRefresh}
    title="Refresh"
    data-tour="refresh"
    className="..."
>
```

## Krok 2 — Dodaj krok

Plik: `resources/js/types/Tour.ts`

```ts
{
    id: 'refresh',
    visit: '/',
    target: 'refresh',
    placement: 'bottom',
    title: 'Always up to date',
    description:
        'Pull in the latest changes from your team without reloading the page.',
},
```

Dodaj go do `TOUR_STEPS` w miejscu, w którym ma się pojawić w przebiegu. Pola:

- `target` — wartość `data-tour`. Pomiń, aby dostać wyśrodkowaną kartę (kroki powitalny / końcowy).
- `placement` — preferowana strona elementu; popup sam się odwraca i jest ograniczany do viewportu.
- `visit` — strona, na której żyje krok. String to stały URL; funkcja może odczytać DOM i zwrócić URL albo `null` (zobacz `firstProjectUrl`). Wycieczka wywołuje `router.visit`, gdy bieżąca ścieżka się różni, i **pomija** krok, jeśli funkcja zwróci `null`.
- `when` — zwróć `false`, aby usunąć krok dla tego użytkownika (np. `hasProjects` ukrywa kroki strony projektu dla kont bez projektów).

## Krok 3 — Poznaj zachowania awaryjne

`useTourTarget` szuka elementu przez 2,5 s (strony renderują się po nawigacji). Jeśli nigdy się nie pojawi albo jest ukryty lub poza ekranem (np. sidebar na mobile), krok jest pokazywany jako wyśrodkowana karta — nigdy nie blokuje wycieczki.

## Krok 4 — Przetestuj

- `resources/js/Components/Organisms/ProductTour/ProductTour.test.tsx` — pokrywa nawigację, pomijanie i wyśrodkowany fallback; dodaj przypadek, jeśli Twój krok używa nowego wzorca `visit`/`when`.
- `resources/js/utils/tour.test.ts` — potrzebny tylko, jeśli zmieniasz logikę pozycjonowania.
