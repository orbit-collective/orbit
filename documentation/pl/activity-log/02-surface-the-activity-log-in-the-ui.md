# Wyświetl log aktywności w UI

`ActivityLogRepository::getRecentForProject()` już istnieje i już robi właściwe zapytanie (`latest()->limit(15)`, eager-loading `user`) — po prostu nigdy nie jest wywoływane. Ten przewodnik podłącza to aż do prawdziwego panelu "Recent activity" na stronie projektu.

## Krok 1 — Wyeksponuj metodę odczytu w Service

Plik: `app/Services/ActivityLogService.php`

```php
<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Repositories\ActivityLogRepository;
use Illuminate\Support\Collection;

class ActivityLogService
{
    public function __construct(
        protected ActivityLogRepository $activityLogRepository
    ) {}

    public function log(?int $projectId, string $body, ?int $userId = null): ActivityLog
    {
        return ActivityLog::query()->create([
            'project_id' => $projectId,
            'user_id' => $userId ?? auth()->id(),
            'body' => $body,
        ]);
    }

    public function getRecentForProject(int $projectId): Collection
    {
        return $this->activityLogRepository->getRecentForProject($projectId);
    }
}
```

`ActivityLogService::log()` dziś buduje model `ActivityLog` bezpośrednio, zamiast w ogóle przechodzić przez `ActivityLogRepository` — to istniejąca niespójność z zasadą [Controller → Service → Repository](../architecture/02-backend-layered-architecture.md) ("każde zapytanie Eloquent żyje w Repository"), poprzedzająca ten przewodnik; `getRecentForProject()` powyżej jest napisane we *właściwy* sposób (delegując do Repository), żeby nie pogłębiać dalej tej niespójności — nie kopiuj kształtu bezpośredniego dostępu do modelu z `log()` dla nowych metod.

## Krok 2 — Przeprowadź to do strony projektu

Plik: `app/Http/Controllers/ProjectController.php`

```php
public function __construct(
    ProjectService $projectService,
    IssueService $issueService,
    UserService $userService,
    ActivityLogService $activityLogService
) {
    $this->projectService = $projectService;
    $this->issueService = $issueService;
    $this->userService = $userService;
    $this->activityLogService = $activityLogService;
}
```

```php
return Inertia::render('Projects/Show', [
    'project' => $project,
    'projects' => $projects,
    'issues' => $issues,
    'queryParams' => request()->query() ?: null,
    'filters' => $filters,
    'savedFilters' => $project->savedFilters()->latest()->get(),
    'users' => $this->userService->getAssignableUsersForProject($project->id),
    'recentActivity' => $this->activityLogService->getRecentForProject($project->id)
        ->map(fn ($entry) => [
            'id' => $entry->id,
            'body' => $entry->body,
            'userName' => $entry->user?->name,
            'createdAt' => $entry->created_at,
        ]),
]);
```

Zmapuj na zwykłą tablicę zamiast przepuszczać kolekcję Eloquent wprost — ta sama konwencja, jakiej trzyma się każda inna metoda mapująca propy w tym kodzie (zobacz `mapMembers()`/`mapInvitations()`/`mapRoles()` w `SettingsController` po ustalony kształt), więc frontend zależy tylko od stabilnego, celowego kształtu, nie od każdej kolumny, jaką akurat ma model.

## Krok 3 — Wyrenderuj to

Nowy typ, plik: `resources/js/types/ActivityLog.ts`

```ts
export interface ActivityLogEntry {
    id: number;
    body: string;
    userName: string | null;
    createdAt: string;
}
```

Nowy komponent, plik: `resources/js/Components/Molecules/ActivityFeed/ActivityFeed.tsx`

```tsx
import { ActivityLogEntry } from '@/types/ActivityLog';
import { formatTimeAgo } from '@/utils/time';

interface ActivityFeedProps {
    entries: ActivityLogEntry[];
}

export default function ActivityFeed({ entries }: ActivityFeedProps) {
    if (entries.length === 0) {
        return (
            <p className="py-6 text-center text-xs text-[var(--text-muted-color)]">
                No activity yet.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            {entries.map((entry) => (
                <div key={entry.id} className="text-sm">
                    <span className="text-[var(--text-color)]">
                        {entry.userName ?? 'Someone'}
                    </span>{' '}
                    <span className="text-[var(--text-gray-color)]">
                        {entry.body}
                    </span>
                    <p className="text-xs text-[var(--text-muted-color)]">
                        {formatTimeAgo(entry.createdAt)} ago
                    </p>
                </div>
            ))}
        </div>
    );
}
```

Potem wyrenderuj `<ActivityFeed entries={recentActivity} />` gdziekolwiek ma to sens dodać w `Pages/Projects/Show.tsx` (panel boczny obok listy issues to naturalne miejsce, na wzór tego, jak [popup powiadomień](../notifications/03-frontend-backend-wiring-overview.md) jest samodzielnym komponentem typu lista-elementów).

## Testy

- `tests/Feature/ActivityLogServiceTest.php` (nowy plik — żaden dziś nie istnieje) — test dla `getRecentForProject()` asercujący, że zwraca wpisy tylko dla właściwego projektu, uporządkowane od najnowszych, ograniczone do 15.
- `tests/Feature/ProjectControllerTest.php` — dodaj test asercujący, że odpowiedź Inertii `show()` zawiera prop `recentActivity` w poprawnym kształcie.
- `resources/js/Components/Molecules/ActivityFeed/ActivityFeed.test.tsx` (nowy plik) — wyrenderuj z wpisami, asercuj, że każdy się renderuje; wyrenderuj z pustą tablicą, asercuj pusty stan "No activity yet.".
