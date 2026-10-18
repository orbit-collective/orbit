# Pokaż priorytety na nowej stronie

Przećwiczony przykład: hipotetyczna jednoprojektowa strona `Triage`,
która listuje issue'y projektu **od najważniejszego**, rysuje
prawdziwą ikonę i kolor priorytetu każdego z nich oraz pozwala
filtrować po priorytecie. Jest zbudowana w kształcie istniejących stron
`Pages/Projects/Show.tsx` i `Pages/Issues/Show.tsx`, więc możesz ją
skopiować dla każdej nowej strony jednoprojektowej.

Zasada stojąca za każdym krokiem: **priorytet to wiersz własnej skali
projektu, nigdy jedno ze słów `low` / `medium` / `high`.** Nie
rozgałęziaj kodu po tych nazwach, nie trzymaj na froncie typu unii ani
`Record` kluczowanego nimi i nie porównuj priorytetów jako stringów —
projekty zmieniają nazwy, dodają, usuwają i przestawiają je. Czytaj dane,
które serwer już wysyła:

| Potrzebujesz… | Czytaj z… |
| --- | --- |
| Nazwy priorytetu issue'a | `issue.priority` (`string \| null`; `null` = brak priorytetu) |
| Jego ikony, koloru, pozycji | `issue.priorityDetails` (`{id, name, color, icon, position} \| null`) |
| Jego id (grupowanie, przenoszenie) | `issue.priority_id` albo `issue.priorityDetails.id` |
| Całej skali projektu | prop `priorities` → `useProjectPriorities().priorities` |
| Domyślnego dla nowych issue'ów | `useProjectPriorities().defaultPriority` |
| Priorytetu po nazwie | `useProjectPriorities().findByName(name)` (bez rozróżniania wielkości liter) |

Pomiń provider (ale nie `priorityDetails`), jeśli strona pokazuje
issue'y z **wielu** projektów naraz, jak `Dashboard`: nie ma jednej
skali do wylistowania. Wiersz issue'a nadal rysuje się z własnego
`priorityDetails`, a liczniki na dashboardzie pochodzą z
`IssueRepository::statsForUser()`, które grupuje po nazwie priorytetu i
niesie kolor oraz ikonę każdej nazwy.

## Krok 1 — Wyślij priorytety projektu z kontrolera

Plik: `app/Http/Controllers/TriageController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\IssueService;
use App\Services\PriorityService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TriageController extends Controller
{
    public function __construct(
        protected IssueService $issueService,
        protected PriorityService $priorityService,
    ) {}

    public function show(Request $request, Project $project): Response
    {
        $this->authorize('view', $project);

        // Ids, not names: ?priority=1,3 is what the issue queries and saved
        // filters understand.
        $filters = [
            'priority' => array_filter(explode(',', $request->query('priority', ''))),
        ];

        return Inertia::render('Projects/Triage', [
            'project' => $project,
            // 'AZ' puts the top of the scale first and issues without a
            // priority last; 'ZA' is the exact reverse.
            'issues' => $this->issueService->getAllByProjectID($project->id, ['sort' => 'priority', 'direction' => 'AZ'], 20, [], $filters),
            'priorities' => $this->priorityService->getPriorities($project)->map->toOption()->values(),
            'selectedPriorityIds' => array_values($filters['priority']),
        ]);
    }
}
```

Trzy rzeczy warte skopiowania dokładnie:

- `getPriorities()` najpierw zasiewa startową skalę, jeśli projekt nigdy
  jej nie miał, więc lista nigdy nie jest pusta dla projektu, w którego
  ustawienia nikt nie zaglądał. Nie odpytuj bezpośrednio
  `$project->priorities()`.
- `->map->toOption()->values()` to sposób, w jaki każdy kontroler buduje
  prop `priorities` (`ProjectController`, `IssueController`,
  `SettingsController::priorityOptions()`): `id`, `name`, `color`,
  `icon`, `position`, `isDefault`. Zakładki ustawień dodatkowo bramkują
  go uprawnieniem `projects.priorities.view`; strona, którą każdy członek
  i tak może otworzyć, tego nie potrzebuje.
- Sortowanie to `IssueRepository::orderByPriority()`, które porządkuje
  po **pozycji** priorytetu w skali jego własnego projektu. Nigdy nie
  pisz `orderBy('priority')` ani `CASE WHEN priority = 'high'` — takiej
  kolumny nie ma.

Zarejestruj trasę tak samo jak `projects.show`:

Plik: `routes/web.php`

```php
Route::get('/projects/{project}/triage', [TriageController::class, 'show'])->name('projects.triage');
```

## Krok 2 — Zamontuj provider i narysuj priorytety

Plik: `resources/js/Pages/Projects/Triage.tsx`

```tsx
import { router } from '@inertiajs/react';
import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import Sidebar from '@/Components/Organisms/Sidebar/Sidebar';
import {
    ProjectPrioritiesProvider,
    useProjectPriorities,
} from '@/context/ProjectPrioritiesContext';
import { Issue, PaginatedResponse } from '@/types/Issues';
import { ProjectPriority } from '@/types/Priorities';
import { Project } from '@/types/Projects';

const NO_PRIORITIES: ProjectPriority[] = [];

interface TriageProps {
    project: Project;
    issues: PaginatedResponse<Issue>;
    priorities?: ProjectPriority[];
    selectedPriorityIds?: string[];
}

/** One chip per priority of the project's scale; the value sent to the server is the id. */
function TriagePriorityFilter({ selected }: { selected: string[] }) {
    const { priorities } = useProjectPriorities();

    const toggle = (id: number) => {
        const value = String(id);
        const next = selected.includes(value)
            ? selected.filter((current) => current !== value)
            : [...selected, value];

        router.get(
            window.location.pathname,
            next.length ? { priority: next.join(',') } : {},
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <div className="flex flex-wrap gap-2 p-3">
            {priorities.map((priority) => (
                <button
                    key={priority.id}
                    type="button"
                    aria-pressed={selected.includes(String(priority.id))}
                    onClick={() => toggle(priority.id)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-[var(--text-color)] aria-pressed:bg-[var(--bg-color)]"
                >
                    <PriorityIcon priority={priority} tooltip={false} />
                    {priority.name}
                </button>
            ))}
        </div>
    );
}

export default function Triage({
    project,
    issues,
    priorities = NO_PRIORITIES,
    selectedPriorityIds = [],
}: TriageProps) {
    return (
        <ProjectPrioritiesProvider priorities={priorities}>
            <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-color)]">
                <Sidebar projects={[project]} />
                <div className="m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[var(--bg-color-hover)]">
                    <TriagePriorityFilter selected={selectedPriorityIds} />
                    <ul>
                        {issues.data.map((issue) => (
                            <li
                                key={issue.id}
                                className="flex items-center gap-2 px-3 py-2"
                            >
                                {/* null renders the dashed "no priority" ring */}
                                <PriorityIcon priority={issue.priorityDetails} />
                                <span>{issue.title}</span>
                                <span className="text-[var(--text-color-muted)]">
                                    {issue.priority ?? 'No priority'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </ProjectPrioritiesProvider>
    );
}
```

Czego dostajesz za darmo:

- `PriorityIcon` przyjmuje cokolwiek z `name`, `color` i `icon` —
  pasuje zarówno `ProjectPriority` ze skali, jak i `priorityDetails`
  issue'a — albo `null` / `undefined` dla przerywanego kółka "brak
  priorytetu" z tooltipem "No priority". Zapisaną nazwę ikony rozwiązuje
  przez `resolvePriorityIcon()` (fallback na `Flag`), więc nigdy nie
  importuj ręcznie ikony lucide dla priorytetu. Jeśli potrzebujesz tylko
  kolorowej kropki, `StatusDot` przyjmuje `color` priorytetu wprost.
- Provider musi opakować drzewo **zanim** wyrenderuje się cokolwiek, co
  woła `useProjectPriorities()`, dlatego `TriagePriorityFilter` jest
  komponentem potomnym, a nie kodem w funkcji samej strony. Bez providera
  hook zwraca pustą skalę i brak domyślnego, a nie błąd.
- Wartością filtra jest **id** priorytetu jako string (`'1,3'` w URL).
  Porównywanie albo wysyłanie tu nazwy po cichu nic by nie dopasowało:
  `?priority=High` jest czytane jako id `0` i ignorowane.
- Aby w formularzu "nowe issue" wstępnie wybrać domyślny priorytet
  projektu, użyj `useProjectPriorities().defaultPriority` (jest `null`,
  gdy projekt nie ma domyślnego) i odeślij **nazwę** — `priority:
  defaultPriority.name` — bo `issues.store` i `issues.update` przyjmują
  nazwy (walidowane przez `App\Rules\ProjectPriorityName`); serwer
  zamienia ją na `priority_id`. Wyślij `priority: null`, by wyczyścić;
  pomiń `priority` całkowicie, by zostawić bez zmian (przy tworzeniu
  oznacza to zastosowanie domyślnego priorytetu projektu).
- Jeśli strona grupuje issue'y po priorytecie (jak `IssueBoard`),
  grupuj po `issue.priority_id` i nazywaj kolumny `priority-<id>`, z
  kolumną `priority-none` na końcu dla `null`. Kolejność kolumn bierz z
  kolejności skali — prop `priorities` jest już od najważniejszego.

## Krok 3 — Testy

Plik: `tests/Feature/TriageControllerTest.php`

```php
<?php

use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use App\Services\PriorityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('a member sees the project priorities and the issues most important first', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    addProjectMember($project, $member->id, 'member');

    $low = app(PriorityService::class)->findByName($project, 'Low');
    $high = app(PriorityService::class)->findByName($project, 'High');
    Issue::factory()->create(['project_id' => $project->id, 'title' => 'Later', 'priority' => 'Low']);
    Issue::factory()->create(['project_id' => $project->id, 'title' => 'Now', 'priority' => 'High']);

    $this->actingAs($member)->get("/projects/$project->id/triage")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Projects/Triage')
            ->has('priorities', 3)
            ->where('priorities.0.name', 'High')
            ->where('issues.data.0.title', 'Now')
            ->where('issues.data.0.priorityDetails.id', $high->id));

    $this->actingAs($member)->get("/projects/$project->id/triage?priority=$low->id")
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 1)
            ->where('issues.data.0.title', 'Later'));
});

test('a user outside the project is forbidden', function () {
    $project = Project::factory()->create();

    $this->actingAs(User::factory()->create())->get("/projects/$project->id/triage")->assertForbidden();
});
```

Plik: `resources/js/Pages/Projects/Triage.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { makeIssue, priorities, priorityFields } from '@/stories/fixtures';
import { makePaginated } from '@/tests/paginated';
import Triage from './Triage';

const project = {
    id: 1,
    name: 'Orbit',
    slug: 'orbit',
    description: '',
    color: 'purple' as const,
    created_at: 0,
    updated_at: 0,
};

describe('Triage Page', () => {
    test('draws one filter chip per project priority and each issue with its own', () => {
        render(
            <Triage
                project={project}
                priorities={priorities}
                issues={makePaginated([
                    makeIssue({
                        id: '1',
                        title: 'Fix login crash',
                        ...priorityFields('High'),
                    }),
                    makeIssue({
                        id: '2',
                        title: 'Tidy the footer',
                        ...priorityFields(null),
                    }),
                ])}
            />,
        );

        expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(
            priorities.length,
        );
        expect(screen.getByText('Fix login crash')).toBeInTheDocument();
        expect(screen.getByText('No priority')).toBeInTheDocument();
    });
});
```

`priorities`, `makeIssue()` i `priorityFields()` z
`resources/js/stories/fixtures.ts` to współdzielona przykładowa skala,
pełny fixture `Issue` oraz helper, który wypełnia `priority`,
`priority_id` i `priorityDetails` issue'a na podstawie nazwy priorytetu
z fixture (albo zostawia je puste dla `null`) — używaj ich zamiast
wypisywać te trzy pola ręcznie.

Uruchom `php artisan test --filter=TriageControllerTest` i
`npm test -- run` przed commitem — dokładne polecenia w głównym
`CLAUDE.md`.
