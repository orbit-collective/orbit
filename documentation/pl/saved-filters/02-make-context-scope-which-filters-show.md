# Spraw, żeby `context` faktycznie sterował tym, które filtry się pokazują

Dziś `context` jest zapisywany (jako `` `project_${projectId}` ``), ale nigdy nie odczytywany z powrotem — `Pages/Projects/Show.tsx` przekazuje **całą** tablicę `savedFilters` do `FilterBar` niezależnie od tego, czy jesteś na widoku List, Board czy Calendar, więc filtr zapisany na Board pojawia się identycznie w dropdownie widoku List. Ten przewodnik sprawia, że `context` niesie też aktywny widok, i filtruje po nim.

## Krok 1 — Oblicz context per widok

Plik: `resources/js/hooks/useSavedFilters.ts`

```ts
export const useSavedFilters = (
    initialSavedFilters: SavedFilter[] = [],
    projectId?: number | string,
    view?: string,
) => {
    const context = projectId
        ? `project_${projectId}_${view ?? 'list'}`
        : 'project_issues';

    const saveFilter = useCallback(
        (name: string, queryParams: Record<string, any>) => {
            if (!projectId) {
                console.error('SavedFilterError: Lack of projectId');
                return;
            }

            router.post(
                '/saved-filters',
                {
                    project_id: projectId,
                    name,
                    context,
                    query_params: queryParams,
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                    onError: (errors) => {
                        console.error('Validation errors:', errors);
                    },
                },
            );
        },
        [projectId, context],
    );

    const deleteFilter = useCallback((id: number) => {
        router.delete(`/saved-filters/${id}`, {
            preserveScroll: true,
            preserveState: true,
        });
    }, []);

    return { savedFilters: initialSavedFilters, saveFilter, deleteFilter };
};
```

`view` jest opcjonalny i domyślnie to `'list'` — każdy istniejący wywołujący, który go nie przekazuje, zapisuje dalej do dokładnie tych samych stringów contextu już w bazie danych (`project_${id}_list`, nie świeży `project_${id}`, który osierociłby każdy wcześniej zapisany filtr). Ta domyślna wartość jest tym, co sprawia, że migracja do contextów per-widok jest wstecznie kompatybilna z istniejącymi wierszami.

## Krok 2 — Filtruj po aktywnym widoku przed renderowaniem

Plik: `resources/js/Pages/Projects/Show.tsx`

```tsx
const viewContext = selectedLook.toLowerCase();

const visibleSavedFilters = savedFilters.filter(
    (filter) => filter.context === `project_${project.id}_${viewContext}`,
);
```

```tsx
<FilterBar
    queryParams={queryParams}
    project={project}
    savedFilters={visibleSavedFilters}
    users={users}
/>
```

Przekaż `viewContext` (albo bezpośrednio `selectedLook`) w dół do miejsca, skąd faktycznie jest wywoływany `useSavedFilters()` — prawdopodobnie wewnątrz `FilterBar` albo jednego z jego dzieci — jako nowy argument `view` z kroku 1, tak żeby filtr zapisany na Board był przechowywany z `project_${id}_board` i pojawiał się z powrotem tylko na Board.

## Krok 3 — Uzupełnij istniejące wiersze (jeśli to trafia do prawdziwej bazy danych)

Każdy wiersz `SavedFilter` utworzony przed tą zmianą ma `context = 'project_${id}'` (bez sufiksu widoku) — nie pasowałby do żadnego z nowych contextów per-widok i po cichu przestałby się gdziekolwiek pojawiać. Jednorazowa migracja albo skrypt `php artisan tinker`, żeby uzupełnić:

```php
\App\Models\SavedFilter::query()
    ->where('context', 'like', 'project_%')
    ->where('context', 'not like', 'project_%_%')
    ->each(fn ($filter) => $filter->update(['context' => "{$filter->context}_list"]));
```

traktuje każdy istniejący wcześniej filtr jako filtr widoku List (rozsądna wartość domyślna, ponieważ List zawsze był domyślnym widokiem aplikacji w stylu `SETTINGS_DEFAULT_TAB`) — dostosuj, jeśli inna domyślna wartość lepiej pasuje do Twoich prawdziwych danych.

## Testy

- `resources/js/hooks/useSavedFilters.test.ts` — zaktualizuj `'saveFilter posts the project scoped context when a projectId is given'`, żeby oczekiwał `context: 'project_42_list'` (nowa domyślna wartość) zamiast starego `'project_42'`, i dodaj przypadek przekazujący `view: 'board'` asercujący `context: 'project_42_board'`.
- `resources/js/Pages/Projects/Show.test.tsx` (albo gdziekolwiek pokryte jest zachowanie tej strony) — dodaj test asercujący, że `savedFilters` przekazane do `FilterBar` zawiera tylko wpisy pasujące do contextu aktywnego widoku przy przełączaniu między List/Board/Calendar.
- `tests/Feature/SavedFilterControllerTest.php` — brak zmian backendu w tym przewodniku, więc żadne zmiany testów tam nie są potrzebne; `context` pozostaje nieprzezroczystym, swobodnie wybranym stringiem z perspektywy Controllera/Service.
