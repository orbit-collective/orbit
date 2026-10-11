# Dodaj źródło wyszukiwania

Przećwiczony przykład: jak **osoby** (`@ann`) dodano obok issues i projektów. Te same kroki dodają każdy nowy rodzaj wyniku. Wszystko idzie przez jeden wewnętrzny endpoint, `GET /command-palette/search`, opisany jako jedyny wyjątek od "brak JSON API" w [`../architecture/05-scope-and-non-goals.md`](../architecture/05-scope-and-non-goals.md).

## Czego potrzebuje źródło

Prefiksu zapytania (opcjonalnie), zapytania repozytorium **ograniczonego do członkostw użytkownika w projektach**, payloadu w odpowiedzi i mapowania na wiersze palety. Trasa, walidacja (`q` ma 1–100 znaków), throttle i obsługa błędów jako JSON (`command-palette/*` w `bootstrap/app.php`) są wspólne; nie ruszasz ich.

## Krok 1 — Repozytorium: ogranicz w zapytaniu

Plik: `app/Repositories/UserRepository.php`

```php
public function searchMembersForUser(int $userId, string $q, int $limit = 8): SupportCollection
{
    $escape = LikePattern::ESCAPE;

    return DB::table('project_user as theirs')
        ->join('project_user as mine', 'mine.project_id', '=', 'theirs.project_id')
        ->join('users', 'users.id', '=', 'theirs.user_id')
        ->join('projects', 'projects.id', '=', 'theirs.project_id')
        ->where('mine.user_id', $userId)
        ->whereRaw("LOWER(users.name) LIKE ? ESCAPE '{$escape}'", [LikePattern::contains($q)])
        // ...select, order prefix-first, limit
        ->get();
}
```

- Join po członkostwie to kontrola dostępu. Nigdy "znajdź, potem odfiltruj".
- Wzorce `LIKE` zawsze buduj przez `App\Support\LikePattern` i `ESCAPE '!'`, żeby wpisane `%` lub `_` pasowało do siebie.
- Rankuj prefiks nad fragmentem, potem wg świeżości lub nazwy, i ogranicz liczbę wierszy.

## Krok 2 — Serwis: skieruj zapytanie i ukształtuj payload

Plik: `app/Services/CommandPaletteSearchService.php`

```php
if (str_starts_with($query, '@')) {
    return $this->searchPeople($userId, trim(substr($query, 1)));
}
```

Każda odpowiedź ma wszystkie klucze (`issues`, `projects`, `people`), więc klient nigdy nie sprawdza ich obecności; źródło, które nie ma zastosowania, zwraca `[]`. Daj każdemu wierszowi payloadu `id`, to co wiersz renderuje, i `url` zbudowany po stronie serwera przez `route(..., absolute: false)`.

## Krok 3 — Frontend: typ, prefiks, stan, mapowanie, renderowanie

1. **Typ i grupa** — `resources/js/types/Commands.ts`: dodaj `PaletteSearchPerson`, dodaj `people` do `PaletteSearchResults`, do `CommandGroup`, `COMMAND_GROUP_ORDER` i `COMMAND_GROUP_LABELS`; dodaj grupę do `GROUP_CATEGORY` w `context/CommandContext.tsx`.
2. **Prefiks** — `resources/js/utils/paletteQuery.ts`:

   ```ts
   if (raw.startsWith('@')) {
       const rest = raw.slice(1).trim();

       return {
           scope: 'people',
           text: rest,
           serverQuery:
               rest.length >= 1 ? `@${rest}`.slice(0, MAX_QUERY_LENGTH) : null,
       };
   }
   ```

   `serverQuery: null` nic nie wysyła; minimalną długość wybierasz osobno dla każdego źródła.
3. **Hook** — `resources/js/hooks/usePaletteSearch.ts`: dodaj pole do stanu idle i czytaj `data.people ?? []`.
4. **Wiersz** — `resources/js/utils/paletteEntities.ts`:

   ```ts
   export const personToCommand = (person: PaletteSearchPerson): Command => ({
       id: `person.${person.id}.${person.project.id}`,
       title: `Show issues assigned to ${person.name}`,
       subtitle: person.project.name,
       group: 'people',
       icon: 'UserSearch',
       perform: () => router.visit(person.url),
   });
   ```

   Zadbaj, by `id` był unikalny dla wiersza (osoba może dzielić dwa projekty).
5. **Renderowanie** — `resources/js/Components/Organisms/CommandPalette/CommandPalette.tsx`: dodaj źródło do listy `entities`, potraktuj jego scope jak `issues` w `entityOnly` i w `emptyMessage` oraz dodaj podpowiedź w stopce.

Lokalne wyniki fuzzy pokazują się pierwsze i natychmiast; grupy z serwera doczytują się pod spodem, ze skeletonem podczas ładowania i dyskretną linią (lokalne wyniki zostają), jeśli żądanie się nie powiedzie.

## Testy

- Repozytorium/serwis (`tests/Feature/CommandPaletteSearchServiceTest.php`): ranking, limit, `%` dopasowane dosłownie i **użytkownik spoza projektu nigdy nie widzi wiersza** — wymagane dla każdego źródła.
- Kontroler (`tests/Feature/CommandPaletteControllerTest.php`): payload przez HTTP i ta sama izolacja nie-członka.
- Frontend: `paletteQuery.test.ts` (prefiks i minimalna długość), `paletteEntities.test.ts` (wiersz), `usePaletteSearch.test.ts` (pole), `CommandPalette.test.tsx` (grupa, nawigacja, podpowiedź w stopce).
