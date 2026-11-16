# Add a development read model

Worked example: showing a repository's **releases** in the Development
view. Seven places need it; miss one and the data is unreachable,
unauthorised, or shown without tests.

## Step 1 — orbit-api: the GitHub call

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

## Step 2 — orbit-api: the DTO, the service method, the endpoint

Add `ReleaseDto` to `development.dto.ts`, map it in
`development.mapper.ts`, then add a method to `DevelopmentService`. Every
public method starts with `this.access.authorize(connection, repositoryId)`
— that is what keeps a repository of another connection out:

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

The endpoint is a Netlify function built with `handleAuthenticated`
(`netlify/functions/github-releases.ts`), parsing the query with the
helpers of `development-request.validator.ts`, plus a redirect in
`netlify.toml`:

```toml
[[redirects]]
  from = "/v1/github/releases"
  to = "/.netlify/functions/github-releases"
  status = 200
  force = true
```

Document it in `docs/api/github.md`, and test the mapper, the client
(`tests/github/development/development.client.test.ts`), the service
(`development.service.test.ts`) and the handler.

## Step 3 — Orbit: the relay client

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

Test it in `tests/Feature/OrbitRelayClientTest.php` with `Http::fake`.

## Step 4 — Orbit: the service method

File: `app/Services/Integrations/Github/GithubDevelopmentService.php`

```php
/** @return list<array<string, mixed>> */
public function releases(Project $project, int $repositoryId): array
{
    [, $token] = $this->context($project, $repositoryId);

    return $this->remember($project, "releases:$repositoryId", fn () => $this->relayClient->listReleases($token, $repositoryId));
}
```

`context()` refuses a project without a connected GitHub and a repository
that is not the project's own; `remember()` caches the plain array for 30
seconds under the project's development scope and turns a relay failure
into a validation message. Never cache an Eloquent object here.

## Step 5 — Orbit: the controller action and route

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

It sits inside the `projects/{project}/development` group, so the JSON
error rendering (`bootstrap/app.php`) and the throttle already apply. A
write would use `manageGithubDevelopment` and the controller's
`assertGithubAccountLinked()`. Test it in
`tests/Feature/GithubDevelopmentControllerTest.php` (success, a viewer,
a stranger, a repository that is not the project's).

## Step 6 — Frontend: types, resource and panel

Add the shape to `resources/js/types/Development.ts` and a builder to
`resources/js/tests/development.ts`, then read it in
`Components/Organisms/DevelopmentView/DevelopmentView.tsx`:

```tsx
const releases = useDevelopmentResource<{ releases: DevelopmentRelease[] }>(
    route_('releases.index'),
    { repository_id: repository.id },
    t('development_view.releases_failed'),
);
```

Put it in `reloadAll` next to the other `reload`s, and give the panel the
same three states the others have (a skeleton while `data` is `null`, an
alert with a retry on `error`, an empty message). Every text goes into
`lang/en/` **and** `lang/pl/` (`<component>.php`), every control is
keyboard reachable and every section is labelled with `aria-labelledby`.

## Step 7 — Tests and stories

- `Components/Organisms/ReleasesPanel/ReleasesPanel.test.tsx` and
  `.stories.tsx` (loading, failed, empty, filled) — copy
  `BranchesPanel`.
- `DevelopmentView.test.tsx` — a case asserting the new request and that a
  failure of it leaves the rest of the view standing.
- `npm run format`, `npm run lint`, `npx tsc --noEmit`, `npm run knip`.
