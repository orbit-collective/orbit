# Add a search source

Worked example: how **people** (`@ann`) were added next to issues and
projects. The same steps add any new kind of result. Everything goes
through one internal endpoint, `GET /command-palette/search`, documented
as the single exception to "no JSON API" in
[`../architecture/05-scope-and-non-goals.md`](../architecture/05-scope-and-non-goals.md).

## What a source needs

A query prefix (optional), a repository query **scoped to the user's
project memberships**, a payload in the response, and a mapping to
palette rows. The route, validation (`q` is 1–100 characters), the
throttle and the JSON error handling (`command-palette/*` in
`bootstrap/app.php`) are shared; you do not touch them.

## Step 1 — Repository: scope it in the query

File: `app/Repositories/UserRepository.php`

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

- The membership join is the access control. Never "find then filter".
- Always build `LIKE` patterns with `App\Support\LikePattern` and
  `ESCAPE '!'`, so a typed `%` or `_` matches itself.
- Rank prefix above substring, then by recency or name, and cap the rows.

## Step 2 — Service: route the query and shape the payload

File: `app/Services/CommandPaletteSearchService.php`

```php
if (str_starts_with($query, '@')) {
    return $this->searchPeople($userId, trim(substr($query, 1)));
}
```

Every response has all keys (`issues`, `projects`, `people`) so the
client never checks for presence; a source that does not apply returns
`[]`. Give each payload row an `id`, what the row renders, and a `url`
built server-side with `route(..., absolute: false)`.

## Step 3 — Frontend: type, prefix, state, mapping, rendering

1. **Type and group** — `resources/js/types/Commands.ts`: add
   `PaletteSearchPerson`, add `people` to `PaletteSearchResults`, to
   `CommandGroup`, `COMMAND_GROUP_ORDER` and `COMMAND_GROUP_LABELS`; add
   the group to `GROUP_CATEGORY` in `context/CommandContext.tsx`.
2. **Prefix** — `resources/js/utils/paletteQuery.ts`:

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

   `serverQuery: null` sends nothing; the minimum length is yours to
   choose per source.
3. **Hook** — `resources/js/hooks/usePaletteSearch.ts`: add the field to
   the idle state and read `data.people ?? []`.
4. **Row** — `resources/js/utils/paletteEntities.ts`:

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

   Make the `id` unique per row (a person can share two projects).
5. **Render** — `resources/js/Components/Organisms/CommandPalette/CommandPalette.tsx`:
   add the source to the `entities` list, treat its scope like `issues`
   in `entityOnly` and in `emptyMessage`, and add a footer hint.

Local fuzzy results show first and instantly; server groups stream in
below, with a skeleton while loading and a subtle line (local results
kept) if the request fails.

## Tests

- Repository/service (`tests/Feature/CommandPaletteSearchServiceTest.php`):
  ranking, the limit, `%` matched literally, and **a user outside the
  project never sees the row** — required for every source.
- Controller (`tests/Feature/CommandPaletteControllerTest.php`): the
  payload over HTTP, and the same non-member isolation.
- Frontend: `paletteQuery.test.ts` (prefix and minimum length),
  `paletteEntities.test.ts` (the row), `usePaletteSearch.test.ts` (the
  field), `CommandPalette.test.tsx` (group, navigation, footer hint).
