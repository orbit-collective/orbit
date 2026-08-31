# Wyświetl log aktywności w UI

`ActivityLogService::getRecentForUser()` już zasila panel "Recent Work Activity" na Dashboardzie, a `getRecentForProject()` już zasila widok issues **Activity** projektu (zobacz [`../issue-views/README.md`](../issue-views/README.md)) — oba renderują tę samą parę komponentów `ActivityLogs`/`ActivityLogItem` na bazie tego samego kształtu `ActivityLogEntry`. Ten przewodnik dodaje trzecią powierzchnię: panel "Recent account activity" w zakładce Ustawień konta Security & access, ponownie wykorzystujący `getRecentForUser()` (dokładnie tę samą metodę odczytu, którą wywołuje już Dashboard), zamiast dodawać nową.

## Krok 1 — Podłącz metodę odczytu do kontrolera Ustawień

Plik: `app/Http/Controllers/SettingsController.php`

```php
public function index(Request $request): Response
{
    $user = $request->user();
    // ...existing $projects/$selectedProject/etc. setup...

    return Inertia::render('Settings/Index', [
        // ...existing keys...
        'sessions' => $this->userService->getUserSessions($user),
        'accountActivity' => $this->activityLogService
            ->getRecentForUser($user->id, 15)
            ->map(fn ($entry) => [
                'id' => $entry->id,
                'body' => $entry->body,
                'userName' => $entry->user?->name,
                'createdAt' => $entry->created_at->diffForHumans(),
            ]),
    ]);
}
```

`ActivityLogService` jest już wstrzykiwany do tego Controllera dla innych funkcji ustawień, więc żadna zmiana konstruktora nie jest potrzebna — wystarczy wywołać metodę, którą już udostępnia. Zmapuj do tego samego kształtu `{ id, body, userName, createdAt }`, którego już używają `DashboardController` i `ProjectController` (`createdAt` sformatowane wcześniej po stronie serwera przez `diffForHumans()`), więc frontend nie potrzebuje drugiego kształtu ani formattera dla tego, co jest tym samym typem `ActivityLogEntry`.

## Krok 2 — Przekaż to do zakładki

Plik: `resources/js/Pages/Settings/Index.tsx`

```tsx
interface SettingsIndexProps {
    // ...existing props...
    accountActivity?: ActivityLogEntry[];
}

export default function SettingsIndex({
    // ...existing props...
    accountActivity = [],
}: SettingsIndexProps) {
    // ...

    {isAccountSettingsTabId(activeTab) ? (
        <AccountSettingsContent
            tabId={activeTab}
            // ...existing props...
            accountActivity={accountActivity}
        />
    ) : ( /* ...unchanged... */ )}
}
```

Następnie przekaż `accountActivity` o jeden poziom dalej, przez gałąź `tabId === 'security-access'` w `AccountSettingsContent`, do `AccountSettingsSecurityTab`, tak samo jak dziś przepływa `sessions`.

## Krok 3 — Wyrenderuj to istniejącymi komponentami

Plik: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsSecurityTab.tsx`

```tsx
import ActivityLogs from '@/Components/Organisms/ActivityLogs/ActivityLogs';
import { ActivityLogEntry } from '@/types/ActivityLog';

interface AccountSettingsSecurityTabProps {
    sessions?: Session[];
    accountActivity?: ActivityLogEntry[];
}

export default function AccountSettingsSecurityTab({
    sessions = [],
    accountActivity = [],
}: AccountSettingsSecurityTabProps) {
    return (
        <div className="space-y-5">
            {/* ...existing Password/Active sessions/Session expiry panels... */}

            <SettingsPanel
                title="Recent account activity"
                description="The last actions taken on your account, across every project."
                icon="Activity"
            >
                <div className="px-2 pb-2">
                    <ActivityLogs logs={accountActivity} />
                </div>
            </SettingsPanel>

            {/* ...existing Delete account panel... */}
        </div>
    );
}
```

Żadnego nowego kodu listy/pustego-stanu/kolorowania ikon — `ActivityLogs` już obsługuje pustą tablicę (własny pusty stan), a `ActivityLogItem` już wyprowadza kolorową kropkę każdego wpisu z jego treści `body` przez `getActivityLogVisual()` (`resources/js/utils/activityLog.ts`). To jest zysk z tego, że Dashboard i widok Activity projektu już współdzielą jedną parę komponentów zamiast każdy pisze swój własny markup listy — trzecia powierzchnia to zmiana w przepływie danych, nie nowy UI.

## Testy

- `tests/Feature/SettingsControllerTest.php` — dodaj przypadek asercujący, że odpowiedź Inertia zawiera prop `accountActivity` w kształcie `{ id, body, userName, createdAt }`, na wzór tego, jak `DashboardControllerTest` (jeśli istnieje) asercuje już `activityLogs`.
- `resources/js/Pages/Settings/Index.test.tsx` — dodaj przypadek asercujący, że `accountActivity` dociera do `AccountSettingsSecurityTab`, gdy `tab=security-access`.
- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsSecurityTab.test.tsx` — dodaj przypadek renderujący z kilkoma wpisami `accountActivity` i asercujący, że się pojawiają, plus przypadek z pustą tablicą asercujący, że renderuje się pusty stan `ActivityLogs`.
