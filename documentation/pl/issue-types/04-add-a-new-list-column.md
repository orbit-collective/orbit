# Dodaj nową kolumnę listy

Przełączalne kolumny tabeli issue'ów są napędzane jednym rejestrem,
`resources/js/utils/issueTableColumns.ts` — to jedyne miejsce, które
definiuje, jakie kolumny istnieją, ich etykietę nagłówka, domyślną
szerokość i to, czy są domyślnie włączone. Wszystko inne (wiersz
nagłówka, dropdown widoczności kolumn, domyślny prop `enabledColumns`
każdego wiersza) czyta z niego. To, co wciąż jest napisane osobno dla
każdej kolumny, celowo, to faktyczny markup komórki w `ListRow.tsx` —
każda kolumna renderuje się inaczej (badge, data, avatar użytkownika,
zwykły tekst), więc ta część nie jest zgeneralizowana. Przećwiczony
przykład: dodanie kolumny `Reporter`, pokazującej twórcę issue
(`issue.creator`), sortowalnej po nazwisku tego użytkownika —
zbudowanej dokładnie w kształcie istniejącej kolumny `Assignee`.

## Krok 1 — Zarejestruj kolumnę

Plik: `resources/js/utils/issueTableColumns.ts`

```ts
export const ISSUE_TABLE_COLUMNS: IssueTableColumnDefinition[] = [
    { value: 'id', label: 'ID', defaultWidth: 70, defaultEnabled: true },
    { value: 'title', label: 'Title', defaultWidth: 400, defaultEnabled: true },
    { value: 'type', label: 'Type', defaultWidth: 140, defaultEnabled: true },
    { value: 'status', label: 'Status', defaultWidth: 120, defaultEnabled: true },
    { value: 'assignee', label: 'Assignee', defaultWidth: 140, defaultEnabled: true },
    { value: 'reporter', label: 'Reporter', defaultWidth: 140, defaultEnabled: false },
    { value: 'priority', label: 'Priority', defaultWidth: 140, defaultEnabled: true },
    { value: 'labels', label: 'Labels', defaultWidth: 200, defaultEnabled: true },
    { value: 'updated', label: 'Updated', defaultWidth: 150, defaultEnabled: true },
    { value: 'start_date', label: 'Start', defaultWidth: 150, defaultEnabled: false },
    { value: 'end_date', label: 'End', defaultWidth: 150, defaultEnabled: false },
];
```

Ten jeden wpis wystarczy, żeby `Reporter` pojawił się w wierszu
nagłówka `IssueTable` (`headers`, wyprowadzane z tej tablicy) i w
dropdownie widoczności kolumn `IssueTableHead` (`options` w
`SelectionDropdown`, również wyprowadzane z tej tablicy) — zobacz
`resources/js/Components/Organisms/IssueTable/IssueTable.tsx` i
`resources/js/Components/Organisms/IssueTableHead/IssueTableHead.tsx`,
żaden z nich nie wymaga dalszych zmian.

## Krok 2 — Dodaj ją do unii `SortingColumn`

Plik: `resources/js/types/Issues.ts`

```ts
export type SortingColumn =
    | 'id'
    | 'title'
    | 'type'
    | 'status'
    | 'assignee'
    | 'reporter'
    | 'priority'
    | 'labels'
    | 'updated'
    | 'start_date'
    | 'end_date';
```

## Krok 3 — Wyrenderuj komórkę

Plik: `resources/js/Components/Organisms/ListRow/ListRow.tsx`

Dodaj komórkę zaraz po komórce `assignee`, powielając dokładnie jej
kształt:

```tsx
{enabledColumns.assignee && (
    <td
        className={cn(
            cellBase,
            'text-[var(--text-gray-color)]',
        )}
        data-column="assignee"
    >
        <UserBadge
            avatarSrc={issue.assignee?.avatar}
            name={issue.assignee?.name ?? 'Unassigned'}
            size="sm"
        />
    </td>
)}
{enabledColumns.reporter && (
    <td
        className={cn(
            cellBase,
            'text-[var(--text-gray-color)]',
        )}
        data-column="reporter"
    >
        <UserBadge
            avatarSrc={issue.creator?.avatar}
            name={issue.creator?.name ?? 'Unknown'}
            size="sm"
        />
    </td>
)}
```

`issue.creator` jest już obecne na każdym `Issue` —
`IssueRepository` już eager-loaduje `creator` na każdym zapytaniu
listy (zobacz Krok 4), więc nie trzeba przekazywać żadnego dodatkowego
propsa, żeby dane trafiły do tego komponentu.

## Krok 4 — Zrób ją sortowalną po stronie backendu

Plik: `app/Repositories/IssueRepository.php`

Dodaj `'reporter'` do `$allowedColumns` i `case` w switchu sortowania,
powielając dokładnie wzorzec `leftJoin` z przypadku `assignee` (alias
złączenia unika tej samej niejednoznaczności `project_id`, co robi to
złączenie kolumny `type`):

```php
$allowedColumns = ['id', 'title', 'status', 'assignee', 'priority', 'labels', 'updated', 'start_date', 'end_date', 'type', 'reporter'];

if ($column && in_array($column, $allowedColumns)) {
    switch ($column) {
        case 'id':
        case 'title':
        case 'status':
        case 'labels':
            $query->orderBy($column, $direction);
            break;

        case 'priority':
            if ($direction === 'asc') {
                $query->orderByRaw("CASE WHEN priority = 'high' THEN 1 WHEN priority = 'medium' THEN 2 WHEN priority = 'low' THEN 3 ELSE 4 END");
            } else {
                $query->orderByRaw("CASE WHEN priority = 'high' THEN 4 WHEN priority = 'medium' THEN 3 WHEN priority = 'low' THEN 2 ELSE 1 END");
            }
            break;

        case 'assignee':
            $query->leftJoin('users', 'issues.assignee_id', '=', 'users.id')
                ->select('issues.*')
                ->orderBy('users.name', $direction);
            break;

        case 'reporter':
            $query->leftJoin('users as reporters', 'issues.user_id', '=', 'reporters.id')
                ->select('issues.*')
                ->orderBy('reporters.name', $direction);
            break;

        case 'type':
            $query->leftJoin('issue_types', 'issues.issue_type_id', '=', 'issue_types.id')
                ->select('issues.*')
                ->orderBy('issue_types.name', $direction);
            break;

        case 'updated':
            $query->orderBy('updated_at', $direction);
            break;
        case 'start_date':
            $query->orderBy('start_date', $direction);
            break;
        case 'end_date':
            $query->orderBy('end_date', $direction);
            break;
    }
} else {
    $query->latest();
}
```

Złączenie ma alias `reporters` (nie `users`), ponieważ własny
`leftJoin('users', ...)` kolumny `assignee` już zajmuje tę nazwę
tabeli w tym samym query builderze — sortowanie po obu kolumnach w
tym samym żądaniu inaczej by się zderzyło. Kolumna, która nie
wymaga sortowania, może całkiem pominąć ten krok; pozostawienie jej
poza `$allowedColumns` sprawia po prostu, że kliknięcie tego nagłówka
nic nie robi (spada do domyślnego porządku `->latest()`) zamiast
błędu.

## Krok 5 — Przepuść kolumnę przez walidację przełącznika widoczności

Plik: `app/Http/Controllers/ProjectController.php`

```php
$validated = $request->validate([
    'columns' => 'required|array',
    'columns.id' => 'sometimes|boolean',
    'columns.title' => 'sometimes|boolean',
    'columns.type' => 'sometimes|boolean',
    'columns.status' => 'sometimes|boolean',
    'columns.assignee' => 'sometimes|boolean',
    'columns.reporter' => 'sometimes|boolean',
    'columns.priority' => 'sometimes|boolean',
    'columns.labels' => 'sometimes|boolean',
    'columns.updated' => 'sometimes|boolean',
    'columns.start_date' => 'sometimes|boolean',
    'columns.end_date' => 'sometimes|boolean',
]);
```

Bez tego przełączenie kolumny w UI nadal działa lokalnie, ale żądanie
`PATCH /projects/{project}/columns` po cichu odrzuca nieznany klucz po
stronie serwera, więc nie zostałby zapisany na stałe między
odświeżeniami.

## Krok 6 — Testy

Plik: `resources/js/Components/Organisms/ListRow/ListRow.test.tsx`

```tsx
test('renders the reporter column when enabled', () => {
    renderRow({
        issue: makeIssue({ creator: { name: 'Jane Doe', avatar: '' } }),
        enabledColumns: { ...DEFAULT_ENABLED_COLUMNS, reporter: true },
    });

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
});
```

(Zaimportuj `DEFAULT_ENABLED_COLUMNS` z `@/utils/issueTableColumns` na
górze pliku, jeśli jeszcze nie jest zaimportowane.)

Plik: `tests/Feature/IssueRepositoryTest.php`

Powiel istniejący test `'it can sort issues by assignee name'`:

```php
test('it can sort issues by reporter name', function () {
    $project = Project::factory()->create();
    $alice = User::factory()->create(['name' => 'Alice']);
    $bob = User::factory()->create(['name' => 'Bob']);
    Issue::factory()->create(['project_id' => $project->id, 'user_id' => $bob->id, 'title' => 'Bob issue']);
    Issue::factory()->create(['project_id' => $project->id, 'user_id' => $alice->id, 'title' => 'Alice issue']);

    $results = $this->repository->getAllPaginated($project->id, 10, ['sort' => 'reporter', 'direction' => 'AZ']);

    expect($results->items()[0]->title)->toBe('Alice issue')
        ->and($results->items()[1]->title)->toBe('Bob issue');
});
```

Plik: `tests/Feature/ProjectControllerTest.php`

Powiel istniejący test `'the type column can be toggled'`, wstawiając
`'reporter'` w miejsce `'type'`.

Uruchom `php artisan test --filter=IssueRepositoryTest`,
`php artisan test --filter=ProjectControllerTest` oraz
`npx vitest run resources/js/Components/Organisms/ListRow` przed
zacommitowaniem.
