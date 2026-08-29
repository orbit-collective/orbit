# Make `context` actually scope which filters show

Today, `context` is stored (as `` `project_${projectId}` ``) but never
read back — `Pages/Projects/Show.tsx` passes the **entire**
`savedFilters` array to `FilterBar` regardless of whether you're on
the List, Board, or Calendar view, so a filter saved while on the
Board shows up identically in the List view's dropdown. This guide
makes `context` carry the active view too, and filters by it.

## Step 1 — Compute a per-view context

File: `resources/js/hooks/useSavedFilters.ts`

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

`view` is optional and defaults to `'list'` — every existing caller
that doesn't pass one keeps saving to exactly the same context strings
already in the database (`project_${id}_list`, not a fresh
`project_${id}` that would orphan every previously-saved filter). This
default is what makes the migration to per-view contexts backward
compatible with existing rows.

## Step 2 — Filter by the active view before rendering

File: `resources/js/Pages/Projects/Show.tsx`

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

Pass `viewContext` (or `selectedLook` directly) down to wherever
`useSavedFilters()` is actually called from — likely inside
`FilterBar` or one of its children — as the new `view` argument from
step 1, so a filter saved while on the Board is stored with
`project_${id}_board` and only reappears on the Board.

## Step 3 — Backfill existing rows (if this ships to a real database)

Every `SavedFilter` row created before this change has
`context = 'project_${id}'` (no view suffix) — it would match none of
the new per-view contexts and silently stop appearing anywhere. A
one-off migration or `php artisan tinker` script to backfill:

```php
\App\Models\SavedFilter::query()
    ->where('context', 'like', 'project_%')
    ->where('context', 'not like', 'project_%_%')
    ->each(fn ($filter) => $filter->update(['context' => "{$filter->context}_list"]));
```

treats every pre-existing filter as a List-view filter (a reasonable
default, since List has always been the app's `SETTINGS_DEFAULT_TAB`-style
default view) — adjust if a different default fits your actual data
better.

## Tests

- `resources/js/hooks/useSavedFilters.test.ts` — update
  `'saveFilter posts the project scoped context when a projectId is
  given'` to expect `context: 'project_42_list'` (the new default)
  instead of the old `'project_42'`, and add a case passing
  `view: 'board'` asserting `context: 'project_42_board'`.
- `resources/js/Pages/Projects/Show.test.tsx` (or wherever this page's
  behavior is covered) — add a test asserting `savedFilters` passed to
  `FilterBar` only includes entries matching the active view's
  context when switching between List/Board/Calendar.
- `tests/Feature/SavedFilterControllerTest.php` — no backend change in
  this guide, so no test changes needed there; `context` stays an
  opaque, freely-chosen string as far as the Controller/Service are
  concerned.
