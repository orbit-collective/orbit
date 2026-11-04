# Dodaj sekcję do portalu

Przećwiczony przykład: sekcja `Queue` z listą nieudanych jobów. Każdy krok wskazuje prawdziwy plik, którego używają istniejące sekcje.

## Krok 1 — Serwis, który nigdy nie rzuca wyjątku

Plik: `app/Services/DeveloperPortal/FailedJobsService.php`

```php
class FailedJobsService
{
    /** @return array{jobs: list<array<string, mixed>>} */
    public function recent(): array
    {
        return Cache::remember('developer-portal:failed-jobs', 5, fn () => [
            'jobs' => DB::table('failed_jobs')->latest('id')->limit(20)->get()->map(fn ($job) => [
                'id' => $job->id,
                'queue' => $job->queue,
                'failedAt' => $job->failed_at,
            ])->all(),
        ]);
    }
}
```

Zasady, których trzymają się istniejące serwisy (`DockerContainerService`, `ErrorLogService`): wyłącznie zwykłe tablice (nigdy nie cache'uj obiektów Eloquent), krótki cache, żeby kilka kart kosztowało jeden odczyt, oraz błąd zamieniony w wartość, którą strona może pokazać, a nie w wyjątek. Duże listy są paginowane w repozytorium (`DeveloperPortalRepository`), a nie ładowane w całości.

## Krok 2 — Wyślij jako odroczony prop

Plik: `app/Http/Controllers/SettingsController.php`

```php
'failedJobs' => Inertia::defer(fn () => $this->failedJobsService->recent()),
```

Tanie agregaty mogą być zwykłymi domknięciami (`totals`); wszystko, co dotyka Dockera, plików lub sieci, to `Inertia::defer`, żeby strona wyrenderowała się najpierw. W Reakcie prop jest po prostu `undefined`, dopóki nie nadejdzie — wyrenderuj stan ładowania, jak robi to `PortalContainersSection`.

## Krok 3 — Komponent sekcji

Plik: `resources/js/Components/Organisms/DeveloperPortal/PortalFailedJobsSection.tsx`

Zbuduj go z istniejących elementów (`SettingsPanel`, `SettingsPanelRow`, `Badge`, `Avatar`/`UserBadge`, `Pagination`) i, dla wykresu, z [komponentów wykresów](./03-chart-components.md). Dodaj typy do `resources/js/types/DeveloperPortal.ts` i zamontuj sekcję w `DeveloperPortalTab.tsx` oraz w propsach strony `resources/js/Pages/Settings/DeveloperPortal.tsx`.

## Krok 4 — Uczyń ją "live"

1. Dodaj rodzaj, np. `jobs`, wywołaniem `app(LiveUpdates::class)->portal('jobs')` obok zapisu, który ją zmienia (no-op, o ile portal nie jest włączony).
2. Zmapuj rodzaj na zestarzałe propsy w `resources/js/live/useDeveloperPortalLive.ts`:

```ts
const PROPS: Record<PortalChangeKind, string[]> = {
    // ...
    jobs: ['failedJobs'],
};
```

3. Dodaj prop do `portalFallbackReloads()`, żeby odświeżał się też bez Reverba, i rozszerz `PortalChangeKind` w `types/DeveloperPortal.ts`.

Ładunek niesie wyłącznie rodzaje, nigdy wiersze (zob. [Ogłoś zmianę](../live-updates/02-announce-a-change.md)).

## Testy i story

- Test Pest dla serwisu i jeden dla propsa kontrolera (`tests/Feature/DeveloperPortalControllerTest.php`).
- Test Vitest obok komponentu oraz story w `DeveloperPortal.stories.tsx` dla stanów ładowania, pustego i wypełnionego (dane przykładowe trafiają do `resources/js/stories/developerPortalFixtures.ts`).
- Rozszerz `useDeveloperPortalLive.test.ts` o nowy rodzaj.
