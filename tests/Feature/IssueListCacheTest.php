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

test('the dashboard list is served from the cache on the second read', function () {
    $first = $this->service->getAllForUser($this->user->id);

    $queries = listQueries(fn () => $this->service->getAllForUser($this->user->id));

    expect($first)->toHaveCount(3)
        ->and($queries)->toBe(0)
        ->and($this->service->getAllForUser($this->user->id))->toBe($first);
});

test('the dashboard list matches what Inertia would have serialised from the models', function () {
    $list = $this->service->getAllForUser($this->user->id);

    expect(json_encode($list))->toBe(json_encode(
        app(IssueRepository::class)->getAllForUser($this->user->id)
    ));
});

test('each user gets their own dashboard list', function () {
    $other = User::factory()->create();

    expect($this->service->getAllForUser($this->user->id))->toHaveCount(3)
        ->and($this->service->getAllForUser($other->id))->toHaveCount(0);
});

test('editing, creating and deleting an issue show up in the dashboard list straight away', function () {
    $this->service->getAllForUser($this->user->id);

    $this->issues->first()->update(['title' => 'Edited title']);
    expect(collect($this->service->getAllForUser($this->user->id))->pluck('title'))->toContain('Edited title');

    $created = Issue::factory()->create(['project_id' => $this->project->id, 'user_id' => $this->user->id]);
    expect($this->service->getAllForUser($this->user->id))->toHaveCount(4);

    $created->delete();
    expect($this->service->getAllForUser($this->user->id))->toHaveCount(3);
});

test('renaming the assignee shows up in the cached lists straight away', function () {
    $assignee = User::factory()->create(['name' => 'Old Name']);
    $this->issues->first()->update(['assignee_id' => $assignee->id]);

    expect(json_encode($this->service->getAllForUser($this->user->id)))->toContain('Old Name');
    expect(json_encode($this->service->getAllForProject($this->project->id)))->toContain('Old Name');

    $assignee->update(['name' => 'New Name']);

    expect(json_encode($this->service->getAllForUser($this->user->id)))->toContain('New Name')->not->toContain('Old Name');
    expect(json_encode($this->service->getAllForProject($this->project->id)))->toContain('New Name');
});

test('leaving a project drops its issues from the cached dashboard list', function () {
    expect($this->service->getAllForUser($this->user->id))->toHaveCount(3);

    (new ProjectMemberRepository)->removeMember($this->project, $this->user->id);

    expect($this->service->getAllForUser($this->user->id))->toHaveCount(0);
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

test('the calendar list follows issue changes', function () {
    expect($this->service->getAllForProject($this->project->id))->toHaveCount(3);

    $this->issues->first()->delete();

    expect($this->service->getAllForProject($this->project->id))->toHaveCount(2);
});
