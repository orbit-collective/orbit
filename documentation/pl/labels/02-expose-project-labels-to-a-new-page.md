# Udostępnij labele projektu nowej stronie

Przećwiczony przykład: nadanie zupełnie nowej, jednoprojektowej
stronie prawdziwych kolorów labeli (zamiast hashowanego fallbacku z
`useProjectLabels()`) przez zamontowanie `ProjectLabelsProvider`.
Dokładnie ten sam wzorzec stosują już `Pages/Projects/Show.tsx` i
`Pages/Issues/Show.tsx` — poniższy przećwiczony przykład to
hipotetyczna strona `Backlog` (widok nieplanowanych issue'ów jednego
projektu), zbudowana w tym samym kształcie, więc możesz skopiować go
w całości do dowolnej nowej strony jednoprojektowej.

Pomiń ten przewodnik, jeśli strona pokazuje issue'y z **wielu**
projektów naraz (jak `Dashboard`) — nie ma wtedy jednego projektu,
którego labele miałyby zastosowanie, więc takie strony polegają na
deterministycznym fallbacku `hashLabelColor()`, i to jest poprawny
wybór, a nie luka do wypełnienia.

## Krok 1 — Zmapuj labele projektu w kontrolerze

Plik: `app/Http/Controllers/BacklogController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Models\Label;
use App\Models\Project;
use App\Services\IssueService;
use App\Services\LabelService;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class BacklogController extends Controller
{
    public function __construct(
        protected IssueService $issueService,
        protected LabelService $labelService,
    ) {}

    public function show(Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Projects/Backlog', [
            'project' => $project,
            'issues' => $this->issueService->getAllForProject($project->id, [], ['status' => ['open']]),
            'labels' => $this->mapLabels($this->labelService->getLabels($project)),
        ]);
    }

    private function mapLabels(Collection $labels): array
    {
        return $labels->map(fn (Label $label) => [
            'id' => $label->id,
            'name' => $label->name,
            'color' => $label->color,
            'description' => $label->description,
            'isSystem' => $label->is_system,
        ])->values()->all();
    }
}
```

`mapLabels()` jest wklejone jeden do jednego z `ProjectController` i
`IssueController` — jest na tyle małe i na tyle specyficzne dla
importów każdego kontrolera, że to repozytorium powtarza je per
kontroler zamiast wyciągać wspólną klasę w stylu `LabelResource`. Zrób
tu to samo, zamiast sięgać po nową abstrakcję.

Zarejestruj trasę tak samo, jak `projects.show`:

Plik: `routes/web.php`

```php
Route::get('/projects/{project}/backlog', [BacklogController::class, 'show'])->name('projects.backlog');
```

## Krok 2 — Zamontuj providera na stronie

Plik: `resources/js/Pages/Projects/Backlog.tsx`

```tsx
import ListRow from '@/Components/Organisms/ListRow/ListRow';
import Sidebar from '@/Components/Organisms/Sidebar/Sidebar';
import { ProjectLabelsProvider } from '@/context/ProjectLabelsContext';
import { Issue } from '@/types/Issues';
import { ProjectLabel } from '@/types/Labels';
import { Project } from '@/types/Projects';

interface BacklogProps {
    project: Project;
    issues: Issue[];
    labels: ProjectLabel[];
}

export default function Backlog({ project, issues, labels }: BacklogProps) {
    return (
        <ProjectLabelsProvider labels={labels}>
            <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-color)]">
                <Sidebar projects={[project]} />
                <div className="m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[var(--bg-color-hover)]">
                    <table className="w-full">
                        <tbody>
                            {issues.map((issue) => (
                                <ListRow
                                    key={issue.id}
                                    issue={issue}
                                    onClick={() => {}}
                                    isClosed={issue.status === 'closed'}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ProjectLabelsProvider>
    );
}
```

Każdy `LabelBadge`/`LabelList`/`EditableLabelList` renderowany gdziekolwiek
wewnątrz `ListRow` teraz automatycznie rozwiązuje swój kolor przez
prawdziwe dane labeli tego providera — żaden z tych komponentów sam nie
przyjmuje propsu `labels`, więc nie ma nic więcej do podpięcia.
Provider musi owijać drzewo **zanim** którykolwiek z nich się
wyrenderuje, dlatego siedzi na górze komponentu strony, a nie np. tylko
wokół samej tabeli.

## Krok 3 — Testy

Plik: `resources/js/Pages/Projects/Backlog.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import Backlog from './Backlog';

const project = {
    id: 1,
    name: 'Orbit',
    slug: 'orbit',
    description: '',
    color: 'purple' as const,
    created_at: 0,
    updated_at: 0,
};

describe('Backlog Page', () => {
    test('renders each issue with its real label color', () => {
        render(
            <Backlog
                project={project}
                issues={[
                    {
                        id: '1',
                        title: 'Fix login crash',
                        status: 'open',
                        priority: 'high',
                        project_id: 1,
                        user_id: 1,
                        labels: ['bug'],
                    },
                ]}
                labels={[
                    {
                        id: 1,
                        name: 'bug',
                        color: '#f44336',
                        description: null,
                        isSystem: true,
                    },
                ]}
            />,
        );

        expect(screen.getByText('bug')).toBeInTheDocument();
    });
});
```

Dodaj `BacklogControllerTest.php`, odzwierciedlający kształt
`tests/Feature/ProjectIntegrationControllerTest.php` (zalogowany
member dostaje 200, ktoś z zewnątrz dostaje 403), plus jedną asercję,
że props `labels` w payloadzie Inertia zgadza się z `$project->labels`.

Przed zacommitowaniem uruchom `php artisan test` i `npm test -- run`
— dokładne komendy znajdziesz w głównym `CLAUDE.md`.
