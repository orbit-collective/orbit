# Dodaj nową etykietę

Przećwiczony przykład: dodanie siódmej etykiety, **`security`**. Pięć miejsc w kodzie produkcyjnym jej potrzebuje (plus jedna własna, zakodowana na sztywno lista w pliku testowym) — pomiń jedno, a nowa etykieta albo w ogóle nie może być przypisana, albo renderuje się bez koloru, albo jest niewidoczna w dropdownie filtra, zależnie od tego, które pominiesz.

## Krok 1 — Dodaj przypadek enuma backendu

Plik: `app/Enums/IssueLabel.php`

```php
<?php

namespace App\Enums;

enum IssueLabel: string
{
    case BUG = 'bug';
    case FEATURE = 'feature';
    case PERFORMANCE = 'performance';
    case DESIGN = 'design';
    case UX = 'ux';
    case CHORE = 'chore';
    case SECURITY = 'security';
}
```

`Issue::labels` jest rzutowane przez `AsEnumArrayObject::class.':'.IssueLabel::class` (zobacz `app/Models/Issue.php`) — ten cast waliduje automatycznie względem przypadków enuma, więc żadna zmiana migracji ani seedera nie jest potrzebna; kolumna jest już zwykłą tablicą JSON stringów, a nowy przypadek jest poprawny w momencie, gdy istnieje.

## Krok 2 — Dodaj typ na froncie

Plik: `resources/js/types/Issues.ts`

```ts
export type IssueLabel =
    'bug' | 'feature' | 'performance' | 'design' | 'ux' | 'chore' | 'security';
```

## Krok 3 — Nadaj jej kolor

Plik: `resources/js/utils/labelColors.ts`

```ts
export const LABEL_COLORS: Record<IssueLabel, string> = {
    bug: '#f44336',
    feature: '#2196f3',
    performance: '#9c27b0',
    design: '#00bcd4',
    ux: '#009688',
    chore: '#e91e63',
    security: '#ff5722',
};
```

Ponieważ `LABEL_COLORS` jest otypowany `Record<IssueLabel, string>`, TypeScript odmówi kompilacji kroku 2 bez tego wpisu też — jedyny element w tym całym łańcuchu z siatką bezpieczeństwa kompilatora, ta sama sytuacja `Record<AccentColor, string>`, jaką [`../accent-colors/01-add-a-new-accent-color.md`](../accent-colors/01-add-a-new-accent-color.md) wywołuje dla `accentLabels`. Wybierz hex wystarczająco odróżnialny od koloru każdej istniejącej etykiety — nic tego nie wymusza, ale własny test `'assigns a distinct color to each label'` w `resources/js/utils/labelColors.test.ts` złapie dokładny duplikat.

## Krok 4 — Spraw, żeby była wybieralna przy edycji issue

Plik: `resources/js/Components/Molecules/EditableLabelList/EditableLabelList.tsx`

```ts
const AVAILABLE_LABELS: IssueLabel[] = [
    'bug',
    'feature',
    'performance',
    'design',
    'ux',
    'chore',
    'security',
];
```

Bez tego, `security` to zupełnie poprawna etykieta, jaką issue mogłoby mieć (np. zaseedowana bezpośrednio do bazy danych), ale UI selektora etykiet nie ma sposobu, żeby dodać ją do issue, które jej jeszcze nie ma — ta stała, nie typ `IssueLabel`, to to, z czego selektor faktycznie renderuje opcje.

## Krok 5 — Spraw, żeby była filtrowalna na liście issues

Plik: `resources/js/Components/Molecules/FilterDropdown/FilterDropdown.tsx`

```ts
labels: {
    paramKey: 'labels',
    label: 'Labels',
    multiSelect: true,
    options: ['bug', 'feature', 'performance', 'design', 'ux', 'chore', 'security'].map(
        (value) => ({
            value,
            render: () => <Badge color={value as any}>{value}</Badge>,
        }),
    ),
},
```

Trzecia, niezależna zakodowana na sztywno lista — ta steruje checkboxami filtra etykiet w pasku narzędzi tabeli/tablicy issues, niepowiązana z `AVAILABLE_LABELS` z kroku 4 ani z samym typem `IssueLabel`.

## Testy

- `resources/js/utils/labelColors.test.ts` — oba istniejące testy iterują po własnej, zakodowanej na sztywno tablicy `labels` (nie wyprowadzonej z kluczy `LABEL_COLORS`) — dodaj do niej `'security'`, inaczej nowy przypadek po prostu w ogóle nie zostanie sprawdzony.
- `tests/Feature/Models/IssueTest.php` (albo gdziekolwiek pokryte jest zachowanie castu `IssueLabel`) — jeśli jest test asercujący pełny zestaw poprawnych etykiet, dodaj `security` do jego oczekiwanej listy.
- `resources/js/Components/Molecules/EditableLabelList/EditableLabelList.test.tsx` — dodaj przypadek asercujący, że `security` pojawia się jako wybieralna opcja.
- `resources/js/Components/Molecules/FilterDropdown/FilterDropdown.test.tsx` (jeśli istnieje) — dodaj `security` do dowolnego testu wyliczającego opcje filtra etykiet.
