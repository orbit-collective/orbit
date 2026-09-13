# Wyświetl log aktywności w UI

`ActivityLogService::getRecentForUser()` już zasila panel "Recent Work Activity" na Dashboardzie, a `getRecentForProject()` już zasila widok issues **Activity** projektu (zobacz [`../issue-views/README.md`](../issue-views/README.md)) — oba renderują tę samą parę komponentów `ActivityLogs`/`ActivityLogItem` na bazie tego samego kształtu `ActivityLogEntry`. Ten przewodnik dodaje trzecią powierzchnię: panel "Recent account activity" w zakładce Ustawień konta Security & access, ponownie wykorzystujący `getRecentForUser()` (dokładnie tę samą metodę odczytu, którą wywołuje już Dashboard), zamiast dodawać nową.

## Krok 1 — Podłącz metodę odczytu do akcji Security & access

Plik: `app/Http/Controllers/SettingsController.php`

```php
public function securityAccess(Request $request): Response
{
    $user = $request->user();

    return Inertia::render('Settings/SecurityAccess', [
        'projects' => $this->projects($request),
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

Plik: `resources/js/Pages/Settings/SecurityAccess.tsx`

```tsx
interface SettingsSecurityAccessProps {
    projects?: Project[];
    sessions?: Session[];
    accountActivity?: ActivityLogEntry[];
}

export default function SettingsSecurityAccess({
    projects = [],
    sessions = [],
    accountActivity = [],
}: SettingsSecurityAccessProps) {
    return (
        <SettingsLayout tabId="security-access" projects={projects}>
            <AccountSettingsSecurityTab
                sessions={sessions}
                accountActivity={accountActivity}
            />
        </SettingsLayout>
    );
}
```

Każda zakładka ustawień jest osobną stroną (zobacz [`../settings-tabs/README.md`](../settings-tabs/README.md)), więc nie ma już dyspozytora, przez który trzeba by przepychać propsa — strona przekazuje go prosto do `AccountSettingsSecurityTab`, tak samo jak dziś robi to z `sessions`.

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

- `tests/Feature/SettingsControllerTest.php` — dodaj przypadek asercujący, że `GET /settings/security-access` zawiera prop `accountActivity` w kształcie `{ id, body, userName, createdAt }`, na wzór tego, jak `DashboardControllerTest` (jeśli istnieje) asercuje już `activityLogs`.
- `resources/js/Pages/Settings/SecurityAccess.test.tsx` — dodaj przypadek asercujący, że `accountActivity` dociera do `AccountSettingsSecurityTab`
- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsSecurityTab.test.tsx` — dodaj przypadek renderujący z kilkoma wpisami `accountActivity` i asercujący, że się pojawiają, plus przypadek z pustą tablicą asercujący, że renderuje się pusty stan `ActivityLogs`.
