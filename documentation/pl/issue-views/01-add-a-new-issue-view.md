# Dodaj nowy widok issues

Przećwiczony przykład: dodanie piątego widoku, **Timeline**, obok istniejących czterech List/Board/Calendar/Activity. Sześć miejsc go potrzebuje — pomiń jedno, a nowy widok albo nie jest osiągalny, albo nie ma skrótu, albo nie jest oferowany jako domyślny, albo renderuje zepsuty podgląd, zależnie od tego, które pominiesz.

## Krok 1 — Rozszerz typ

Plik: `resources/js/types/Issues.ts`

```ts
export type IssuePageLooks = 'List' | 'Board' | 'Calendar' | 'Activity' | 'Timeline';
```

## Krok 2 — Wyrenderuj go

Plik: `resources/js/Pages/Projects/Show.tsx`

```tsx
{selectedLook === 'List' ? (
    <IssueTable
        issues={issues.data}
        queryParams={queryParams}
        project={project}
        pagination={
            <Pagination
                links={issues.links}
                from={issues.from}
                to={issues.to}
                total={issues.total}
                queryParams={queryParams}
            />
        }
    />
) : selectedLook === 'Board' ? (
    <>
        <div className={'flex flex-1 flex-row overflow-hidden'}>
            <IssueBoard issues={issues.data} />
        </div>
        <Pagination
            links={issues.links}
            from={issues.from}
            to={issues.to}
            total={issues.total}
            queryParams={queryParams}
        />
    </>
) : selectedLook === 'Calendar' ? (
    <CalendarView issues={issues.data} />
) : selectedLook === 'Activity' ? (
    <ActivityLogs logs={activityLogs} />
) : (
    <TimelineView issues={issues.data} />
)}
```

List, Board i Calendar przyjmują tę samą tablicę `issues.data` i prezentują ją inaczej — Activity jest wyjątkiem, czyta zamiast tego osobny prop `activityLogs` (zobacz [`../activity-log/README.md`](../activity-log/README.md), skąd się on bierze). Nowy widok zbudowany na `issues.data`, jak ten przykład z Timeline, to nowy komponent konsumujący ten sam prop, nie nowa ścieżka pobierania danych. Dodaj `import TimelineView from '@/Components/Organisms/TimelineView/TimelineView';` do importów pliku i zbuduj `TimelineView` na wzór wewnętrznej struktury tego istniejącego widoku, który jest najbliższy (oś pozioma wg daty ma więcej wspólnego z `CalendarView` niż z `IssueBoard`).

Zaktualizuj też guard walidacji `localStorage` tuż nad renderem, w tym samym pliku:

```ts
const [selectedLook, setSelectedLook] = useState<IssuePageLooks>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('selectedLook');
        if (
            saved === 'List' ||
            saved === 'Board' ||
            saved === 'Calendar' ||
            saved === 'Activity' ||
            saved === 'Timeline'
        ) {
            return saved;
        }
    }
    return 'List';
});
```

Pomiń to, a użytkownik, który wybrał Timeline jako swój domyślny widok (krok 5), zostanie po cichu odbity z powrotem do List przy następnym wczytaniu strony — guard odrzuca każdy string, którego jawnie nie rozpoznaje, włącznie z całkowicie poprawnym nowym.

## Krok 3 — Dodaj zakładkę nawigacji i jej skrót

Plik: `resources/js/Layouts/MainLayout.tsx` — nagłówek strony projektu (ikona, tytuł, zakładki widoków, akcja „New issue") to `PageHeader` konfigurowany z tego layoutu, a nie dedykowany komponent nawigacji, więc zarówno skrót, jak i przycisk zakładki żyją tutaj.

```tsx
const shortcuts = useMemo(
    (): ShortcutDefinition[] => [
        // ...existing 'c'/'ctrl+i' shortcuts...
        {
            key: '1',
            description: 'List view',
            category: 'View',
            action: () => setSelectedLook('List'),
        },
        {
            key: '2',
            description: 'Board view',
            category: 'View',
            action: () => setSelectedLook('Board'),
        },
        {
            key: '3',
            description: 'Calendar view',
            category: 'View',
            action: () => setSelectedLook('Calendar'),
        },
        {
            key: '4',
            description: 'Activity view',
            category: 'View',
            action: () => setSelectedLook('Activity'),
        },
        {
            key: '5',
            description: 'Timeline view',
            category: 'View',
            action: () => setSelectedLook('Timeline'),
        },
    ],
    [setSelectedLook],
);
```

a potem pasujący wpis w tablicy `tabs` przekazywanej do `<PageHeader>`, kopiując dokładny kształt wpisów `List`/`Board`/`Calendar`/`Activity` (`{ id: 'Timeline', label: 'Timeline', icon: ..., isActive: selectedLook === 'Timeline', onClick: () => setSelectedLook('Timeline') }`) — `PageHeader` renderuje każdy wpis z `tabs` jako przycisk nawigacji pod tytułem, w wierszu przewijanym poziomo na wąskich ekranach, więc dodanie piątej zakładki nie wymaga żadnych zmian w layoucie. Zobacz [`../shortcuts/02-register-a-global-shortcut.md`](../shortcuts/02-register-a-global-shortcut.md) po ogólny kształt dodawania takiego skrótu, chociaż ten jest scope'owany do strony projektu, nie faktycznie globalny.

## Krok 4 — Dodaj go jako opcję domyślnego widoku w Ustawieniach konta

Plik: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsPreferencesTab.tsx`

```ts
const issueViewOptions: Array<{
    id: IssuePageLooks;
    icon: 'Rows3' | 'Columns3' | 'CalendarDays' | 'Activity' | 'ChartGantt';
    description: string;
}> = [
    {
        id: 'List',
        icon: 'Rows3',
        description: 'A dense, sortable table of every issue.',
    },
    {
        id: 'Board',
        icon: 'Columns3',
        description: 'Kanban columns grouped by status or priority.',
    },
    {
        id: 'Calendar',
        icon: 'CalendarDays',
        description: 'Issues plotted against their due dates.',
    },
    {
        id: 'Activity',
        icon: 'Activity',
        description: 'A chronological feed of all issue activity.',
    },
    {
        id: 'Timeline',
        icon: 'ChartGantt',
        description: 'Issues laid out on a horizontal timeline.',
    },
];
```

i ten sam guard walidacji `localStorage` co w kroku 2 istnieje **drugi, niezależny raz** w inicjalizatorze `useState` `selectedLook` tego pliku — zaktualizuj go też:

```ts
const [selectedLook, setSelectedLook] = useState<IssuePageLooks>(() => {
    const saved = localStorage.getItem('selectedLook');
    if (
        saved === 'List' ||
        saved === 'Board' ||
        saved === 'Calendar' ||
        saved === 'Activity' ||
        saved === 'Timeline'
    ) {
        return saved;
    }
    return 'List';
});
```

Kopia w tym pliku to ta, która faktycznie wywołuje `localStorage.setItem('selectedLook', option.id)`, gdy karta zostanie kliknięta — guard w Show.tsx z kroku 2 tylko *odczytuje* to z powrotem przy następnej wizycie na stronie projektu.

## Krok 5 — Dodaj jego podgląd do karty ustawień

Plik: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsIssueViewCard.tsx`

```tsx
function IssueViewPreview({ view }: { view: IssuePageLooks }) {
    if (view === 'Board') {
        return <BoardPreview />;
    }

    if (view === 'Calendar') {
        return <CalendarPreview />;
    }

    if (view === 'Activity') {
        return <ActivityPreview />;
    }

    if (view === 'Timeline') {
        return <TimelinePreview />;
    }

    return <ListPreview />;
}
```

Dodaj komponent `TimelinePreview` na wzór tego samego kształtu co `ListPreview`/`BoardPreview`/`CalendarPreview`/`ActivityPreview` w tym pliku (małe, czysto dekoracyjne makiety o stałej treści — nie czytają prawdziwych danych issue, po prostu renderują kilka placeholder-owych pasków/bloków ilustrujących layout; trzy kropki `ActivityPreview` połączone linią osi czasu to najbliższa istniejąca referencja dla widoku nietabelarycznego). Pominięcie tego kroku niczego nie psuje — fallback `return <ListPreview />` na końcu łańcucha `if` sprawia, że karta ustawień Timeline po prostu po cichu pokazuje podgląd List zamiast własnego.

## Testy

- `resources/js/Pages/Projects/Show.test.tsx` — dodaj przypadek asercujący, że `selectedLook === 'Timeline'` renderuje `TimelineView`, oraz przypadek dla guarda `localStorage` akceptującego `'Timeline'`.
- `resources/js/Layouts/MainLayout.test.tsx` — dodaj przypadek dla nowej zakładki widoku i jej skrótu `'5'`, na wzór dokładnie istniejących przypadków testowych `List`/`Board`/`Calendar`/`Activity`.
- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsPreferencesTab.test.tsx` — dodaj przypadek wybierający kartę Timeline i asercujący, że `localStorage.setItem` zostało wywołane z `'Timeline'`.
- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsIssueViewCard.test.tsx` — dodaj przypadek asercujący, że `view="Timeline"` renderuje `TimelinePreview`, na wzór istniejącego przypadku `Activity`/`ActivityPreview`.
- `resources/js/Components/Organisms/TimelineView/TimelineView.test.tsx` (nowy plik) — jakiekolwiek pokrycie pasujące do faktycznego zachowania nowego komponentu, na wzór kształtu `CalendarView.test.tsx` jako najbliższej istniejącej referencji.
