# Add a section to the portal

Worked example: a `Queue` section listing failed jobs. Every step names the
real file the existing sections use.

## Step 1 — A service that never throws

File: `app/Services/DeveloperPortal/FailedJobsService.php`

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

Rules the existing services follow (`DockerContainerService`,
`ErrorLogService`): plain arrays only (never cache Eloquent objects), a short
cache so several tabs cost one read, and a failure becomes a value the page can
show, not an exception. Big lists are paginated in the repository
(`DeveloperPortalRepository`), not loaded whole.

## Step 2 — Ship it as a deferred prop

File: `app/Http/Controllers/SettingsController.php`

```php
'failedJobs' => Inertia::defer(fn () => $this->failedJobsService->recent()),
```

Cheap aggregates may be plain closures (`totals`); anything that touches Docker,
files or the network is `Inertia::defer` so the page paints first. In React the
prop is simply `undefined` until it arrives — render a loading state, as
`PortalContainersSection` does.

## Step 3 — The section component

File: `resources/js/Components/Organisms/DeveloperPortal/PortalFailedJobsSection.tsx`

Build it from existing parts (`SettingsPanel`, `SettingsPanelRow`, `Badge`,
`Avatar`/`UserBadge`, `Pagination`) and, for a chart, the
[chart components](./03-chart-components.md). Add the types to
`resources/js/types/DeveloperPortal.ts` and mount the section in
`DeveloperPortalTab.tsx` and in the page props of
`resources/js/Pages/Settings/DeveloperPortal.tsx`.

## Step 4 — Make it live

1. Add a kind, e.g. `jobs`, to `DeveloperPortalChanged` callers:
   `app(LiveUpdates::class)->portal('jobs')` next to the write that changes it
   (a no-op unless the portal is on).
2. Map the kind to the stale props in `resources/js/live/useDeveloperPortalLive.ts`:

```ts
const PROPS: Record<PortalChangeKind, string[]> = {
    // ...
    jobs: ['failedJobs'],
};
```

3. Add the prop to `portalFallbackReloads()` so it also refreshes without
   Reverb, and extend `PortalChangeKind` in `types/DeveloperPortal.ts`.

The payload carries kinds only, never rows (see
[Announce a change](../live-updates/02-announce-a-change.md)).

## Tests and story

- A Pest test for the service and one for the controller prop
  (`tests/Feature/DeveloperPortalControllerTest.php`).
- A Vitest test beside the component, plus a story in
  `DeveloperPortal.stories.tsx` for loading, empty and filled states (sample
  data goes in `resources/js/stories/developerPortalFixtures.ts`).
- Extend `useDeveloperPortalLive.test.ts` for the new kind.
