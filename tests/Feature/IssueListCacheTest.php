<?php

use App\Enums\Permissions\RoleType;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use App\Repositories\IssueRepository;
use App\Repositories\ProjectMemberRepository;
use App\Services\IssueService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->project = Project::factory()->create();
    addProjectMember($this->project, $this->user->id, RoleType::OWNER);
    $this->issues = Issue::factory()->count(3)->create(['project_id' => $this->project->id, 'user_id' => $this->user->id]);
    $this->service = app(IssueService::class);
});

function listQueries(Closure $callback): int
{
    DB::flushQueryLog();
    DB::enableQueryLog();
    $callback();
    $count = count(DB::getQueryLog());
    DB::disableQueryLog();

    return $count;
}

test('the dashboard stats are served from the cache on the second read', function () {
    $first = $this->service->getStatsForUser($this->user->id);

    $queries = listQueries(fn () => $this->service->getStatsForUser($this->user->id));

    expect($first['total'])->toBe(3)
        ->and($queries)->toBe(0)
        ->and($this->service->getStatsForUser($this->user->id))->toBe($first);
});

test('the dashboard stats count issues by priority and status category in one query', function () {
    Issue::query()->delete();
    Issue::factory()->todo()->create(['project_id' => $this->project->id, 'priority' => 'high']);
    Issue::factory()->inProgress()->create(['project_id' => $this->project->id, 'priority' => 'high']);
    Issue::factory()->done()->create(['project_id' => $this->project->id, 'priority' => 'low']);

    $queries = listQueries(fn () => app(IssueRepository::class)->statsForUser($this->user->id));
    $stats = app(IssueRepository::class)->statsForUser($this->user->id);

    expect($queries)->toBe(1)
        ->and($stats['total'])->toBe(3)
        ->and($stats['priority'])->toBe(['high' => 2, 'medium' => 0, 'low' => 1])
        ->and($stats['category'])->toBe(['todo' => 1, 'in_progress' => 1, 'done' => 1]);
});

test('each user gets their own dashboard stats', function () {
    $other = User::factory()->create();

    expect($this->service->getStatsForUser($this->user->id)['total'])->toBe(3)
        ->and($this->service->getStatsForUser($other->id)['total'])->toBe(0);
});

test('creating and deleting an issue show up in the dashboard stats straight away', function () {
    $this->service->getStatsForUser($this->user->id);

    $created = Issue::factory()->create(['project_id' => $this->project->id, 'user_id' => $this->user->id]);
    expect($this->service->getStatsForUser($this->user->id)['total'])->toBe(4);

    $created->delete();
    expect($this->service->getStatsForUser($this->user->id)['total'])->toBe(3);
});

test('renaming the assignee shows up in the cached calendar list straight away', function () {
    $assignee = User::factory()->create(['name' => 'Old Name']);
    $this->issues->first()->update(['assignee_id' => $assignee->id, 'start_date' => '2026-10-10', 'end_date' => '2026-10-12']);

    expect(json_encode($this->service->getCalendarIssues($this->project->id, '2026-10-01', '2026-10-31')))->toContain('Old Name');

    $assignee->update(['name' => 'New Name']);

    expect(json_encode($this->service->getCalendarIssues($this->project->id, '2026-10-01', '2026-10-31')))->toContain('New Name')->not->toContain('Old Name');
});

test('leaving a project drops its issues from the cached dashboard stats', function () {
    expect($this->service->getStatsForUser($this->user->id)['total'])->toBe(3);

    (new ProjectMemberRepository)->removeMember($this->project, $this->user->id);

    expect($this->service->getStatsForUser($this->user->id)['total'])->toBe(0);
});

test('a project page is cached per page and per filter set', function () {
    $this->actingAs($this->user);

    $all = $this->service->getAllByProjectID($this->project->id, [], 2);
    $again = listQueries(fn () => $this->service->getAllByProjectID($this->project->id, [], 2));

    $filtered = $this->service->getAllByProjectID($this->project->id, [], 2, ['search' => 'zzz-no-match']);

    expect($all['total'])->toBe(3)
        ->and($all['data'])->toHaveCount(2)
        ->and($again)->toBe(0)
        ->and($filtered['total'])->toBe(0);
});

test('the paginated project list follows issue changes and keeps its pagination shape', function () {
    $this->actingAs($this->user);

    $before = $this->service->getAllByProjectID($this->project->id, [], 10);
    Issue::factory()->create(['project_id' => $this->project->id, 'user_id' => $this->user->id]);
    $after = $this->service->getAllByProjectID($this->project->id, [], 10);

    expect($before['total'])->toBe(3)
        ->and($after['total'])->toBe(4)
        ->and($after)->toHaveKeys(['data', 'current_page', 'last_page', 'per_page', 'links', 'path']);
});

test('the calendar list only holds issues overlapping the asked range and follows issue changes', function () {
    $inRange = $this->issues[0];
    $inRange->update(['start_date' => '2026-10-05', 'end_date' => '2026-10-08']);
    $spanning = $this->issues[1];
    $spanning->update(['start_date' => '2026-09-20', 'end_date' => '2026-11-02']);
    $outside = $this->issues[2];
    $outside->update(['start_date' => '2026-12-01', 'end_date' => '2026-12-05']);

    $ids = fn () => collect($this->service->getCalendarIssues($this->project->id, '2026-10-01', '2026-10-31'))->pluck('id')->sort()->values()->all();

    expect($ids())->toBe([$inRange->id, $spanning->id]);

    $inRange->delete();

    expect($ids())->toBe([$spanning->id]);
});

test('the deadlines list holds unfinished issues with an end date, soonest first', function () {
    Issue::query()->delete();
    $later = Issue::factory()->todo()->create(['project_id' => $this->project->id, 'start_date' => '2026-01-01', 'end_date' => '2026-12-01']);
    $sooner = Issue::factory()->inProgress()->create(['project_id' => $this->project->id, 'start_date' => '2026-01-01', 'end_date' => '2026-11-01']);
    Issue::factory()->done()->create(['project_id' => $this->project->id, 'start_date' => '2026-01-01', 'end_date' => '2026-10-01']);

    $ids = collect($this->service->getUpcomingDeadlines($this->project->id))->pluck('id')->all();

    expect($ids)->toBe([$sooner->id, $later->id]);
});
