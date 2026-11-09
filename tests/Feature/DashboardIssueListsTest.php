<?php

use App\Models\Issue;
use App\Models\IssueType;
use App\Models\Project;
use App\Models\User;
use App\Services\IssueService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-11-10 10:00:00');
    $this->user = User::factory()->create();
    $this->project = Project::factory()->create();
    addProjectMember($this->project, $this->user->id, 'admin');
    $this->service = app(IssueService::class);
});

/** An issue of the user's project, due `$days` from today (null: no end date). */
function dueIssue(Project $project, ?int $days, array $overrides = [], string $category = 'todo'): Issue
{
    $factory = Issue::factory()->{match ($category) {
        'done' => 'done',
        'in_progress' => 'inProgress',
        default => 'todo',
    }}();

    return $factory->create(array_merge([
        'project_id' => $project->id,
        'assignee_id' => null,
        'start_date' => null,
        'end_date' => $days === null ? null : Carbon::today()->addDays($days),
    ], $overrides));
}

describe('the counters of the stats', function () {
    test('count what is overdue, due within a week and assigned to the user, among open issues only', function () {
        dueIssue($this->project, -3);                                              // overdue
        dueIssue($this->project, -1, ['assignee_id' => $this->user->id]);           // overdue, mine
        dueIssue($this->project, 0);                                               // due today (soon)
        dueIssue($this->project, 7);                                               // last day of soon
        dueIssue($this->project, 8);                                               // later
        dueIssue($this->project, null, ['assignee_id' => $this->user->id]);         // mine, no date
        dueIssue($this->project, -5, [], 'done');                                  // finished: not counted

        $stats = $this->service->getStatsForUser($this->user->id);

        expect($stats)->toMatchArray(['overdue' => 2, 'dueSoon' => 2, 'assigned' => 2]);
    });

    test('ignore the projects the user is not a member of', function () {
        $other = Project::factory()->create();
        dueIssue($other, -2, ['assignee_id' => $this->user->id]);

        expect($this->service->getStatsForUser($this->user->id))
            ->toMatchArray(['overdue' => 0, 'dueSoon' => 0, 'assigned' => 0]);
    });

    test('are zero when there are no issues', function () {
        expect($this->service->getStatsForUser($this->user->id))
            ->toMatchArray(['overdue' => 0, 'dueSoon' => 0, 'assigned' => 0, 'types' => []]);
    });

    test('count the issues of each type, the biggest group first, with types of one name merged', function () {
        $second = Project::factory()->create();
        addProjectMember($second, $this->user->id, 'member');

        dueIssue($this->project, 1);
        dueIssue($this->project, 2);
        dueIssue($second, 3);
        // The factory makes a "Task" type per project; add a bug in the first.
        $bug = IssueType::query()->create(['project_id' => $this->project->id, 'name' => 'Bug', 'icon' => 'Bug', 'color' => '#ef4444', 'is_system' => false]);
        Issue::factory()->create(['project_id' => $this->project->id, 'issue_type_id' => $bug->id, 'assignee_id' => null]);

        $types = $this->service->getStatsForUser($this->user->id)['types'];

        expect($types)->toHaveCount(2)
            ->and($types[0])->toMatchArray(['name' => 'Task', 'count' => 3])
            ->and($types[1])->toMatchArray(['name' => 'Bug', 'count' => 1]);
    });
});

describe('my issues', function () {
    test('lists the open issues assigned to the user in their projects, as plain rows', function () {
        $mine = dueIssue($this->project, 2, ['assignee_id' => $this->user->id, 'title' => 'Mine']);
        dueIssue($this->project, 2, ['assignee_id' => User::factory()->create()->id]);           // someone else's
        dueIssue($this->project, 2, ['assignee_id' => $this->user->id], 'done');                 // finished
        dueIssue(Project::factory()->create(), 2, ['assignee_id' => $this->user->id]);           // a project they left

        $rows = $this->service->getMyIssuesForUser($this->user->id);

        expect($rows)->toHaveCount(1)
            ->and($rows[0])->toMatchArray([
                'id' => $mine->id,
                'number' => $mine->number,
                'title' => 'Mine',
                'projectId' => $this->project->id,
                'projectName' => $this->project->name,
                'assigneeId' => $this->user->id,
                'endDate' => Carbon::today()->addDays(2)->toDateString(),
            ])
            ->and($rows[0]['type'])->toMatchArray(['name' => 'Task'])
            ->and($rows[0]['status'])->toMatchArray(['category' => 'todo']);
    });

    test('puts the nearest end date first, issues without one last', function () {
        dueIssue($this->project, null, ['assignee_id' => $this->user->id, 'title' => 'No date']);
        dueIssue($this->project, 9, ['assignee_id' => $this->user->id, 'title' => 'Later']);
        dueIssue($this->project, 1, ['assignee_id' => $this->user->id, 'title' => 'Soon']);

        $titles = collect($this->service->getMyIssuesForUser($this->user->id))->pluck('title')->all();

        expect($titles)->toBe(['Soon', 'Later', 'No date']);
    });

    test('is capped, so a long backlog is not shipped whole', function () {
        Issue::factory()->todo()->count(35)->create([
            'project_id' => $this->project->id,
            'assignee_id' => $this->user->id,
        ]);

        expect($this->service->getMyIssuesForUser($this->user->id))->toHaveCount(30);
    });
});

describe('deadlines', function () {
    test('lists open issues with an end date up to a month ahead, the nearest first, overdue ones included', function () {
        dueIssue($this->project, 5, ['title' => 'In five']);
        dueIssue($this->project, -40, ['title' => 'Long overdue']);
        dueIssue($this->project, 30, ['title' => 'Edge of the month']);
        dueIssue($this->project, 31, ['title' => 'Too far']);
        dueIssue($this->project, null, ['title' => 'No date']);
        dueIssue($this->project, 2, ['title' => 'Finished'], 'done');
        dueIssue(Project::factory()->create(), 3, ['title' => 'Not mine']);

        $titles = collect($this->service->getDeadlinesForUser($this->user->id))->pluck('title')->all();

        expect($titles)->toBe(['Long overdue', 'In five', 'Edge of the month']);
    });

    test('says who the issue is assigned to, so the widget can show only the ones of the user', function () {
        $other = User::factory()->create();
        dueIssue($this->project, 1, ['assignee_id' => $this->user->id, 'title' => 'Mine']);
        dueIssue($this->project, 2, ['assignee_id' => $other->id, 'title' => 'Theirs']);
        dueIssue($this->project, 3, ['assignee_id' => null, 'title' => 'Nobody']);

        $rows = collect($this->service->getDeadlinesForUser($this->user->id))->keyBy('title');

        expect($rows['Mine']['assigneeId'])->toBe($this->user->id)
            ->and($rows['Theirs']['assigneeId'])->toBe($other->id)
            ->and($rows['Nobody']['assigneeId'])->toBeNull();
    });
});

describe('on the dashboard page', function () {
    $layoutWith = fn (string $type) => ['widgets' => [[
        'id' => 'w', 'type' => $type, 'variant' => $type === 'deadlines' ? 'list' : 'list',
        'width' => 60, 'height' => 100, 'visible' => true, 'config' => [],
    ]]];

    test('send the lists only while a visible widget reads them', function () use ($layoutWith) {
        dueIssue($this->project, 1, ['assignee_id' => $this->user->id]);

        $this->actingAs($this->user)->put('/dashboard/layout', $layoutWith('my_issues'))->assertSessionHasNoErrors();

        $this->actingAs($this->user)->get('/')->assertInertia(fn (Assert $page) => $page
            ->has('myIssues', 1)
            ->missing('deadlines')
            ->missing('productivity_trend')
        );

        $this->actingAs($this->user)->put('/dashboard/layout', $layoutWith('deadlines'))->assertSessionHasNoErrors();

        $this->actingAs($this->user)->get('/')->assertInertia(fn (Assert $page) => $page
            ->has('deadlines', 1)
            ->missing('myIssues')
        );
    });

    test('send the lists when they are asked for, as the editor does for a widget it just added', function () {
        dueIssue($this->project, 1, ['assignee_id' => $this->user->id]);
        $this->actingAs($this->user)->put('/dashboard/layout', ['widgets' => []]);

        $this->actingAs($this->user)
            ->get('/', ['X-Inertia' => 'true', 'X-Inertia-Partial-Component' => 'Dashboard', 'X-Inertia-Partial-Data' => 'myIssues,deadlines', 'X-Inertia-Version' => Inertia::getVersion()])
            ->assertJsonStructure(['props' => ['myIssues', 'deadlines']]);
    });

    test('keep the new counters in the stats', function () {
        dueIssue($this->project, -1);

        $this->actingAs($this->user)->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('issueStats.overdue', 1)
            ->has('issueStats.dueSoon')
            ->has('issueStats.assigned')
            ->has('issueStats.types', 1)
        );
    });
});
