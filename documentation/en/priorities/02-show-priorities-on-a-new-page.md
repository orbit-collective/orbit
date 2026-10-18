# Show priorities on a new page

Worked example: a hypothetical single-project `Triage` page that lists
the project's issues **most important first**, draws each one's real
priority icon and color, and lets the user filter by priority. It is
built in the shape of the existing `Pages/Projects/Show.tsx` and
`Pages/Issues/Show.tsx`, so you can copy it for any new single-project
page.

The rule behind every step: **a priority is a row of the project's own
scale, never one of the words `low` / `medium` / `high`.** Don't branch
on those names, don't keep a frontend union type or `Record` keyed by
them, and don't compare priorities as strings — projects rename, add,
delete and reorder them. Read the data the server already sends:

| You need… | Read it from… |
| --- | --- |
| An issue's priority name | `issue.priority` (`string \| null`; `null` = no priority) |
| Its icon, color, position | `issue.priorityDetails` (`{id, name, color, icon, position} \| null`) |
| Its id (grouping, moving) | `issue.priority_id` or `issue.priorityDetails.id` |
| The project's whole scale | the `priorities` prop → `useProjectPriorities().priorities` |
| The default for new issues | `useProjectPriorities().defaultPriority` |
| A priority by name | `useProjectPriorities().findByName(name)` (case-insensitive) |

Skip the provider (but not `priorityDetails`) if the page shows issues
from **multiple** projects at once, like `Dashboard`: there is no one
scale to list. An issue row still draws itself from its own
`priorityDetails`, and the dashboard's counts come from
`IssueRepository::statsForUser()`, which groups by priority name and
carries each name's color and icon.

## Step 1 — Send the project's priorities from the controller

File: `app/Http/Controllers/TriageController.php`

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

Three things worth copying exactly:

- `getPriorities()` seeds the starter scale first if the project has
  never had one, so the list is never empty for a project nobody has
  opened the settings of. Don't query `$project->priorities()` directly.
- `->map->toOption()->values()` is how every controller builds the
  `priorities` prop (`ProjectController`, `IssueController`,
  `SettingsController::priorityOptions()`): `id`, `name`, `color`,
  `icon`, `position`, `isDefault`. The settings tabs additionally gate it
  on `projects.priorities.view`; a page every member can already open
  doesn't need to.
- The sort is `IssueRepository::orderByPriority()`, which orders by the
  priority's **position** in its own project's scale. Never write
  `orderBy('priority')` or a `CASE WHEN priority = 'high'` — there is no
  such column.

Register the route the same way `projects.show` is:

File: `routes/web.php`

```php
Route::get('/projects/{project}/triage', [TriageController::class, 'show'])->name('projects.triage');
```

## Step 2 — Mount the provider and draw the priorities

File: `resources/js/Pages/Projects/Triage.tsx`

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

Notes on what that gets you for free:

- `PriorityIcon` takes anything with `name`, `color` and `icon` — a
  `ProjectPriority` from the scale and an issue's `priorityDetails` both
  fit — or `null` / `undefined` for the dashed "no priority" ring with a
  "No priority" tooltip. It resolves the stored icon name through
  `resolvePriorityIcon()` (falling back to `Flag`), so never import a
  lucide icon by hand for a priority. If you only need a colored dot,
  `StatusDot` takes the priority's `color` directly.
- The provider has to wrap the tree **before** anything that calls
  `useProjectPriorities()` renders, which is why `TriagePriorityFilter`
  is a child component rather than code in the page function itself.
  Without a provider the hook returns an empty scale and no default,
  not an error.
- The filter value is the priority **id** as a string (`'1,3'` in the
  URL). Comparing or sending the name here would silently match nothing:
  `?priority=High` is read as id `0` and ignored.
- To pre-select the project's default for a "new issue" form use
  `useProjectPriorities().defaultPriority` (it is `null` when the
  project has no default), and send the **name** back — `priority:
  defaultPriority.name` — because `issues.store` and `issues.update`
  take names (validated by `App\Rules\ProjectPriorityName`); the server
  turns it into `priority_id`. Send `priority: null` to clear it; omit
  `priority` entirely to leave it unchanged (on create, that applies the
  project default).
- If the page groups issues by priority (like `IssueBoard`), group by
  `issue.priority_id` and name columns `priority-<id>`, with a
  `priority-none` column at the end for `null`. Order columns by the
  scale's order — the `priorities` prop is already most important first.

## Step 3 — Tests

File: `tests/Feature/TriageControllerTest.php`

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

File: `resources/js/Pages/Projects/Triage.test.tsx`

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

`priorities`, `makeIssue()` and `priorityFields()` in
`resources/js/stories/fixtures.ts` are the shared sample scale, a full
`Issue` fixture, and the helper that fills an issue's `priority`,
`priority_id` and `priorityDetails` from a fixture priority's name (or
leaves them empty for `null`) — use them rather than writing those three
fields out by hand.

Run `php artisan test --filter=TriageControllerTest` and
`npm test -- run` before committing — see the root `CLAUDE.md` for the
exact commands.
