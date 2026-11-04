# React to a change in the UI

The worked example makes a hypothetical project **Milestones** page refresh when
a `milestones` change arrives (the type announced in
[Announce a change](./02-announce-a-change.md)).

## The pieces

All in `resources/js/live/`:

| File | Role |
| --- | --- |
| `echo.ts` | one lazy Echo instance; authorises private channels through axios (session cookie + XSRF) |
| `useLiveConnection.ts` | the Reverb connection from the shared `live` prop, or `null` when live updates are off |
| `useLiveChannel.ts` | subscribe to private channel(s) for the life of a component, ref-counted per channel |
| `reloadQueue.ts` / `useLiveReload.ts` | coalesce and run `router.reload` calls; pause them |
| `changeProps.ts` | pure functions: "these changes make these props stale" |
| `useLiveFallback.ts` | polling when there is no socket ([guide 05](./05-fallback-and-troubleshooting.md)) |
| `socketHeader.ts` | sends `X-Socket-ID` so the tab that made a change is not told about it again |

## Step 1 — Make the props lazy

A partial reload (`only: [...]`) still *builds* every prop that is a plain value.
Make every prop that costs a query or a computation a closure, so a live refresh
pays only for what it asks for (cheap values such as the `$project` already
loaded by route binding can stay plain):

File: `app/Http/Controllers/MilestoneController.php`

```php
        return Inertia::render('Milestones/Index', [
            'project' => $project,
            'milestones' => fn () => $this->milestoneService->forProject($project),
            'canCreate' => fn () => $project->hasPermission($request->user(), Permission::PROJECT_UPDATE),
        ]);
```

`ProjectController::show`, `IssueController::show` and `DashboardController::index`
were converted this way.

## Step 2 — Say which props a change makes stale

File: `resources/js/live/changeProps.ts` — add a pure function (and a test in
`changeProps.test.ts`; these functions are where all the "what refreshes what"
decisions live):

```ts
/** The milestones page re-reads its list when a milestone changes. */
export function milestonePageReloads(changes: ProjectChange[]): LiveReload[] {
    if (hasType(changes, ACCESS_TYPES)) return [{}];

    return hasType(changes, new Set(['milestones']))
        ? [{ only: ['milestones'] }]
        : [];
}
```

`[{}]` re-reads the whole page (used when someone's access changed, since every
ability on the page may differ).

## Step 3 — A hook for the page

File: `resources/js/live/useMilestonesLive.ts`

```ts
import { ProjectChangedPayload } from '@/types/Live';
import { milestonePageReloads } from './changeProps';
import { requestLiveReload } from './reloadQueue';
import { useLiveChannel } from './useLiveChannel';
import { useLiveFallback } from './useLiveFallback';

export function useMilestonesLive(projectId: number): void {
    // No socket: re-read the list on a timer instead.
    useLiveFallback(() =>
        milestonePageReloads([{ type: 'milestones', id: null, action: 'bulk' }]),
    );

    useLiveChannel<{ 'project.changed': ProjectChangedPayload }>(
        `project.${projectId}`,
        {
            'project.changed': ({ changes }) =>
                milestonePageReloads(changes).forEach((reload) =>
                    requestLiveReload(reload),
                ),
        },
    );
}
```

`useLiveChannel(channel, handlers)`: `handlers` maps the server's
`broadcastAs()` name to a callback; the latest callbacks are always used without
resubscribing, and a `null` channel or live updates being off subscribes to
nothing. The channel may also be an array.

A change to the **current user's own** access (their membership or role) arrives
on `user.{id}` as `access.changed` and is handled once for the whole app by
`LiveBridge` (`resources/js/Components/Organisms/LiveBridge/LiveBridge.tsx`),
which re-reads the whole page. A page hook therefore does not subscribe to it;
it only reacts to the project's `members` and `roles` changes through
`project.changed`, as `ACCESS_TYPES` does above.

Call it from the page: `useMilestonesLive(project.id);`. Existing examples:
`useProjectLive` (project page, takes the visible view and the calendar range),
`useIssueLive` (also leaves the page when the issue is deleted),
`useDashboardLive`, `useSettingsLive`.

## Step 4 — Pause while the user is mid-gesture

A refresh in the middle of a drag would pull the card from under the pointer.
`useLivePause(isBusy)` holds reloads back while `isBusy` is true and runs the
queued ones as soon as it ends:

File: `resources/js/Components/Organisms/IssueBoard/IssueBoard.tsx`

```tsx
    // A live refresh mid-drag would pull the card out from under the pointer.
    useLivePause(draggingIssue !== null);
```

Reloads are also held while the tab is hidden and run once when it is shown
again. They are sent as `async` visits, so they never cancel a visit the user
started. Inertia keeps scroll position and component state on `reload`, so an
open form or half-written comment survives.

## Step 5 — Tests

Mock `useLiveChannel` and `reloadQueue` and call the handler it registered — see
`resources/js/live/pageHooks.test.tsx` for the pattern. Pages that call your hook
need `vi.mock('@/live/useMilestonesLive', ...)` in their own test, because they
render without an Inertia `usePage` mock (see `Pages/Dashboard.test.tsx`).
