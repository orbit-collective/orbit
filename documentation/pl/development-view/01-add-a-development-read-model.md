# Dodaj model odczytu developmentu

Przećwiczony przykład: pokazanie **releases** repozytorium w widoku
Development. Potrzebuje siedmiu miejsc; pominięcie któregokolwiek
oznacza dane nieosiągalne, nieautoryzowane albo bez testów.

## Krok 1 — orbit-api: wywołanie GitHuba

Files: `orbit-api/src/github/development/development.types.ts`,
`development.client.ts`

```ts
export interface GitHubRelease {
    tag_name: string;

    name: string | null;

    html_url: string;

    published_at: string | null;
}
```

```ts
public listReleases(
    token: string,
    owner: string,
    name: string,
): Promise<GitHubRelease[]> {
    return githubRequest<GitHubRelease[]>(
        `${repositoryPath(owner, name)}/releases?per_page=10`,
        { token },
    );
}
```

## Krok 2 — orbit-api: DTO, metoda serwisu, endpoint

Dodaj `ReleaseDto` do `development.dto.ts`, zmapuj je w
`development.mapper.ts`, potem dodaj metodę do `DevelopmentService`.
Każda publiczna metoda zaczyna się od
`this.access.authorize(connection, repositoryId)` — to ono nie wpuszcza
repozytorium innego połączenia:

```ts
public async listReleases(
    connection: GitHubConnection,
    repositoryId: number,
): Promise<ReleaseDto[]> {
    const { repository, token } =
        await this.access.authorize(
            connection,
            repositoryId,
        );

    const releases = await this.client.listReleases(
        token,
        repository.owner,
        repository.name,
    );

    return releases.map(toRelease);
}
```

Endpoint to funkcja Netlify zbudowana na `handleAuthenticated`
(`netlify/functions/github-releases.ts`), parsująca zapytanie helperami z
`development-request.validator.ts`, plus przekierowanie w `netlify.toml`:

```toml
[[redirects]]
  from = "/v1/github/releases"
  to = "/.netlify/functions/github-releases"
  status = 200
  force = true
```

Opisz go w `docs/api/github.md` i przetestuj mapper, klienta
(`tests/github/development/development.client.test.ts`), serwis
(`development.service.test.ts`) oraz handler.

## Krok 3 — Orbit: klient relay

File: `app/Services/Integrations/Github/OrbitRelayClient.php`

```php
/** @return list<array<string, mixed>> */
public function listReleases(string $relayToken, int $repositoryId): array
{
    $data = $this->request(
        fn () => $this->authenticatedClient($relayToken)->get('/v1/github/releases', ['repositoryId' => $repositoryId]),
        'GET /v1/github/releases',
    );

    return $data['releases'];
}
```

Przetestuj go w `tests/Feature/OrbitRelayClientTest.php` z `Http::fake`.

## Krok 4 — Orbit: metoda serwisu

File: `app/Services/Integrations/Github/GithubDevelopmentService.php`

```php
/** @return list<array<string, mixed>> */
public function releases(Project $project, int $repositoryId): array
{
    [, $token] = $this->context($project, $repositoryId);

    return $this->remember($project, "releases:$repositoryId", fn () => $this->relayClient->listReleases($token, $repositoryId));
}
```

`context()` odmawia projektowi bez podłączonego GitHuba oraz
repozytorium, które nie należy do projektu; `remember()` cache'uje zwykłą
tablicę na 30 sekund pod zakresem developmentu projektu i zamienia błąd
relay w komunikat walidacji. Nigdy nie cache'uj tu obiektu Eloquent.

## Krok 5 — Orbit: akcja kontrolera i trasa

Files: `app/Http/Controllers/GithubDevelopmentController.php`,
`routes/web.php`

```php
public function releases(Request $request, Project $project): JsonResponse
{
    $this->authorize('viewGithubDevelopment', $project);

    $data = $request->validate(['repository_id' => 'required|integer|min:1']);

    return response()->json(['releases' => $this->developmentService->releases($project, $data['repository_id'])]);
}
```

```php
Route::get('/releases', [GithubDevelopmentController::class, 'releases'])->name('releases.index');
```

Leży wewnątrz grupy `projects/{project}/development`, więc renderowanie
błędów jako JSON (`bootstrap/app.php`) i throttle już działają. Zapis
użyłby `manageGithubDevelopment` i `assertGithubAccountLinked()` z
kontrolera. Przetestuj w `tests/Feature/GithubDevelopmentControllerTest.php`
(sukces, viewer, obcy, repozytorium spoza projektu).

## Krok 6 — Frontend: typy, zasób i panel

Dodaj kształt do `resources/js/types/Development.ts` i builder do
`resources/js/tests/development.ts`, potem czytaj go w
`Components/Organisms/DevelopmentView/DevelopmentView.tsx`:

```tsx
const releases = useDevelopmentResource<{ releases: DevelopmentRelease[] }>(
    route_('releases.index'),
    { repository_id: repository.id },
    t('development_view.releases_failed'),
);
```

Dodaj go do `reloadAll` obok pozostałych `reload` i daj panelowi te same
trzy stany co inne (szkielet, gdy `data` to `null`, alert z ponowieniem
przy `error`, komunikat o pustce). Każdy tekst trafia do `lang/en/` **i**
`lang/pl/` (`<component>.php`), każdy element jest osiągalny z klawiatury,
a każda sekcja ma etykietę `aria-labelledby`.

## Krok 7 — Testy i stories

- `Components/Organisms/ReleasesPanel/ReleasesPanel.test.tsx` and
  `.stories.tsx` (ładowanie, błąd, pusto, z danymi) — skopiuj
  `BranchesPanel`.
- `DevelopmentView.test.tsx` — przypadek sprawdzający nowe żądanie oraz że jego
  błąd nie przewraca reszty widoku.
- `npm run format`, `npm run lint`, `npx tsc --noEmit`, `npm run knip`.
