# Expose project labels to a new page

Worked example: giving a brand-new, single-project page real label
colors (instead of `useProjectLabels()`'s hashed fallback) by mounting
a `ProjectLabelsProvider`. This is exactly the pattern
`Pages/Projects/Show.tsx` and `Pages/Issues/Show.tsx` already use — the
worked example below is a hypothetical `Backlog` page (a
single-project, unscheduled-issues view) built in that same shape, so
you can copy it wholesale for any new single-project page.

Skip this if the page shows issues from **multiple** projects at once
(like `Dashboard`) — there's no one project whose labels apply, so
those pages rely on `hashLabelColor()`'s deterministic fallback
instead, and that's the correct choice, not a gap to fill in.

## Step 1 — Map the project's labels in the controller

File: `app/Http/Controllers/BacklogController.php`

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

`mapLabels()` is copy-pasted verbatim from `ProjectController` and
`IssueController` — it's small enough, and specific enough to each
controller's own imports, that this codebase repeats it per-controller
rather than extracting a shared `LabelResource`-style class. Do the
same here rather than reaching for a new abstraction.

Register the route the same way `projects.show` is:

File: `routes/web.php`

```php
Route::get('/projects/{project}/backlog', [BacklogController::class, 'show'])->name('projects.backlog');
```

## Step 2 — Mount the provider in the page

File: `resources/js/Pages/Projects/Backlog.tsx`

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

Every `LabelBadge`/`LabelList`/`EditableLabelList` rendered anywhere
inside `ListRow` now resolves its color through this provider's real
per-project label data automatically — none of those components take a
`labels` prop themselves, so there's nothing else to wire up. The
provider has to wrap the tree **before** any of them render, which is
why it sits at the top of the page component rather than, say, around
just the table.

## Step 3 — Tests

File: `resources/js/Pages/Projects/Backlog.test.tsx`

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

Add a `BacklogControllerTest.php` mirroring
`tests/Feature/ProjectIntegrationControllerTest.php`'s shape (an
`actingAs` member gets a 200, an outsider gets a 403) plus one
assertion that the Inertia payload's `labels` prop matches
`$project->labels`.

Run `php artisan test` and `npm test -- run` before committing — see
the root `CLAUDE.md` for the exact commands.
