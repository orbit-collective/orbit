# Zareaguj na zmianę w UI

Przerobiony przykład sprawia, że hipotetyczna strona **Milestones** projektu odświeża się, gdy nadejdzie zmiana `milestones` (typ ogłoszony w [Ogłoś zmianę](./02-announce-a-change.md)).

## Elementy

Wszystko w `resources/js/live/`:

| Plik | Rola |
| --- | --- |
| `echo.ts` | jedna leniwa instancja Echo; autoryzuje kanały prywatne przez axios (cookie sesji + XSRF) |
| `useLiveConnection.ts` | połączenie Reverb ze współdzielonego propa `live` albo `null`, gdy aktualizacje na żywo są wyłączone |
| `useLiveChannel.ts` | subskrypcja kanału(ów) prywatnych na czas życia komponentu, z licznikiem referencji na kanał |
| `reloadQueue.ts` / `useLiveReload.ts` | łączenie i wykonywanie wywołań `router.reload`; ich wstrzymywanie |
| `changeProps.ts` | czyste funkcje: „te zmiany unieważniają te propsy" |
| `useLiveFallback.ts` | odpytywanie, gdy nie ma gniazda ([przewodnik 05](./05-fallback-and-troubleshooting.md)) |
| `socketHeader.ts` | wysyła `X-Socket-ID`, żeby karta, która dokonała zmiany, nie była o niej informowana ponownie |

## Krok 1 — Zrób propsy leniwymi

Częściowe przeładowanie (`only: [...]`) nadal *buduje* każdy prop będący zwykłą wartością. Zrób z każdego propa closure, żeby odświeżenie na żywo płaciło tylko za to, o co prosi:

Plik: `app/Http/Controllers/MilestoneController.php`

```php
        return Inertia::render('Milestones/Index', [
            'project' => $project,
            'milestones' => fn () => $this->milestoneService->forProject($project),
            'canCreate' => fn () => $project->hasPermission($request->user(), Permission::PROJECT_UPDATE),
        ]);
```

`ProjectController::show`, `IssueController::show` i `DashboardController::index` zostały tak przerobione.

## Krok 2 — Powiedz, które propsy zmiana unieważnia

Plik: `resources/js/live/changeProps.ts` — dodaj czystą funkcję (i test w `changeProps.test.ts`; w tych funkcjach żyją wszystkie decyzje „co odświeża co"):

```ts
/** The milestones page re-reads its list when a milestone changes. */
export function milestonePageReloads(changes: ProjectChange[]): LiveReload[] {
    if (hasType(changes, ACCESS_TYPES)) return [{}];

    return hasType(changes, new Set(['milestones']))
        ? [{ only: ['milestones'] }]
        : [];
}
```

`[{}]` pobiera ponownie całą stronę (używane, gdy zmienił się czyjś dostęp, bo każde uprawnienie na stronie może być inne).

## Krok 3 — Hook dla strony

Plik: `resources/js/live/useMilestonesLive.ts`

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

`useLiveChannel(channel, handlers)`: `handlers` mapuje nazwę z `broadcastAs()` po stronie serwera na callback; zawsze używane są najnowsze callbacki bez ponownej subskrypcji, a `null` w miejscu kanału albo wyłączone aktualizacje na żywo nie subskrybują niczego. Kanał może być też tablicą.

Wywołaj go ze strony: `useMilestonesLive(project.id);`. Istniejące przykłady: `useProjectLive` (strona projektu, przyjmuje widoczny widok i zakres kalendarza), `useIssueLive` (opuszcza stronę także, gdy zgłoszenie zostanie usunięte), `useDashboardLive`, `useSettingsLive`.

## Krok 4 — Wstrzymaj, gdy użytkownik jest w trakcie gestu

Odświeżenie w środku przeciągania wyciągnęłoby kartę spod wskaźnika. `useLivePause(isBusy)` wstrzymuje przeładowania, dopóki `isBusy` jest prawdziwe, i wykonuje zakolejkowane zaraz po jego zakończeniu:

Plik: `resources/js/Components/Organisms/IssueBoard/IssueBoard.tsx`

```tsx
    // A live refresh mid-drag would pull the card out from under the pointer.
    useLivePause(draggingIssue !== null);
```

Przeładowania są też wstrzymywane, gdy karta przeglądarki jest ukryta, i wykonywane raz po jej ponownym pokazaniu. Idą jako wizyty `async`, więc nigdy nie anulują wizyty rozpoczętej przez użytkownika. Inertia zachowuje przy `reload` pozycję przewijania i stan komponentów, więc otwarty formularz czy napisany do połowy komentarz przetrwają.

## Krok 5 — Testy

Zamockuj `useLiveChannel` i `reloadQueue` i wywołaj zarejestrowany handler — wzór w `resources/js/live/pageHooks.test.tsx`. Strony wywołujące Twój hook potrzebują `vi.mock('@/live/useMilestonesLive', ...)` we własnym teście, bo renderują się bez mocka `usePage` z Inertia (zobacz `Pages/Dashboard.test.tsx`).
