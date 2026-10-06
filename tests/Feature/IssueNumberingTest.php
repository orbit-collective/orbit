<?php

use App\Models\ActivityLog;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use App\Services\IssueTypeService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

function memberOfProject(Project $project): User
{
    $user = User::factory()->create();
    $project->users()->attach($user->id, ['role' => 'member']);

    return $user;
}

test('issue numbers are counted per project, not globally', function () {
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();

    Issue::factory()->count(3)->create(['project_id' => $projectA->id]);
    $first = Issue::factory()->create(['project_id' => $projectB->id]);
    $next = Issue::factory()->create(['project_id' => $projectA->id]);

    expect($first->number)->toBe(1)
        ->and($next->number)->toBe(4)
        ->and($first->id)->not->toBe($first->number);
});

test('a deleted issue number is never reused', function () {
    $project = Project::factory()->create();
    $issues = Issue::factory()->count(2)->create(['project_id' => $project->id]);

    $issues->last()->delete();
    $replacement = Issue::factory()->create(['project_id' => $project->id]);

    expect($replacement->number)->toBe(3);
});

test('the same number can exist in two projects but not twice in one', function () {
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();

    Issue::factory()->create(['project_id' => $projectA->id, 'number' => 5]);
    Issue::factory()->create(['project_id' => $projectB->id, 'number' => 5]);

    expect(fn () => Issue::factory()->create(['project_id' => $projectA->id, 'number' => 5]))
        ->toThrow(QueryException::class);
});

test('numbering continues after legacy issues whose number equals their id', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'id' => 200, 'number' => 200]);

    $issue = Issue::factory()->create(['project_id' => $project->id]);

    expect($issue->number)->toBe(201);
});

test('an explicit number moves the counter past it so the next automatic number cannot collide', function () {
    $project = Project::factory()->create();

    Issue::factory()->create(['project_id' => $project->id, 'number' => 7]);

    expect($project->fresh()->next_issue_number)->toBe(8)
        ->and(Issue::factory()->create(['project_id' => $project->id])->number)->toBe(8);
});

test('an explicit number below the counter leaves the counter alone', function () {
    $project = Project::factory()->create();
    $issues = Issue::factory()->count(3)->create(['project_id' => $project->id]);
    $issues[1]->delete();

    Issue::factory()->create(['project_id' => $project->id, 'number' => 2]);

    expect($project->fresh()->next_issue_number)->toBe(4);
});

test('allocating a number is one atomic counter increment, not a read followed by a write', function () {
    $project = Project::factory()->create();
    $queries = [];

    DB::listen(function ($query) use (&$queries) {
        $queries[] = strtolower($query->sql);
    });

    Issue::factory()->create(['project_id' => $project->id]);

    $counterUpdates = array_values(array_filter(
        $queries,
        fn (string $sql) => str_contains($sql, 'update "projects"') && str_contains($sql, 'next_issue_number'),
    ));

    expect($counterUpdates)->toHaveCount(1)
        ->and($counterUpdates[0])->toContain('"next_issue_number" = "next_issue_number" + 1');
});

test('creating an issue in a project that does not exist fails instead of getting a number', function () {
    expect(fn () => Issue::query()->create(['title' => 'x', 'project_id' => 99999]))
        ->toThrow(Exception::class);
});

test('creating an issue through the controller numbers it within its project and logs that number', function () {
    $other = Project::factory()->create();
    Issue::factory()->count(5)->create(['project_id' => $other->id]);
    $project = Project::factory()->create();
    $user = memberOfProject($project);

    $this->actingAs($user)->post('/issues', [
        'title' => 'First in project',
        'project_id' => $project->id,
        'priority' => 'medium',
        'status' => 'open',
    ]);

    $issue = Issue::where('project_id', $project->id)->first();

    expect($issue?->number)->toBe(1);
    $this->assertDatabaseHas('activity_logs', ['project_id' => $project->id, 'body' => 'Added new task: #1']);
});

test('issue search matches the per-project number, scoped to the project', function () {
    $project = Project::factory()->create();
    $user = memberOfProject($project);
    $other = Project::factory()->create();
    Issue::factory()->count(12)->create(['project_id' => $other->id]);
    $mine = Issue::factory()->count(2)->create(['project_id' => $project->id]);

    $this->actingAs($user)
        ->getJson(route('projects.issues.search', [$project->id, 'q' => '2']))
        ->assertOk()
        ->assertJsonFragment(['id' => $mine->last()->id, 'number' => 2])
        ->assertJsonCount(1);
});

function epicIn(Project $project, User $user): Issue
{
    app(IssueTypeService::class)->ensureSystemIssueTypes($project);
    $epicType = $project->issueTypes()->where('name', 'Epic')->first();

    return $project->issues()->create([
        'title' => 'Big Epic', 'project_id' => $project->id, 'user_id' => $user->id,
        'issue_type_id' => $epicType->id, 'priority' => 'high', 'status' => 'open',
    ]);
}

test('sub-issue activity names the parent by its project number, not its id', function () {
    $project = Project::factory()->create();
    $other = Project::factory()->create();
    Issue::factory()->count(4)->create(['project_id' => $other->id]);
    $user = memberOfProject($project);
    $parent = epicIn($project, $user);

    $this->actingAs($user)->post('/issues', [
        'title' => 'Child',
        'project_id' => $project->id,
        'priority' => 'low',
        'status' => 'open',
        'parent_id' => $parent->id,
    ])->assertRedirect();

    expect($parent->id)->not->toBe($parent->number);
    $this->assertDatabaseHas('activity_logs', [
        'project_id' => $project->id,
        'body' => 'Issue #2 added as a sub-issue of #'.$parent->number,
    ]);
});

test('moving an issue under a parent logs the parent number', function () {
    $project = Project::factory()->create();
    $other = Project::factory()->create();
    Issue::factory()->count(4)->create(['project_id' => $other->id]);
    $user = memberOfProject($project);
    $parent = epicIn($project, $user);
    $child = Issue::factory()->create(['project_id' => $project->id]);

    $this->actingAs($user)->patch("/issues/$child->id", ['parent_id' => $parent->id])->assertRedirect();

    expect($parent->id)->not->toBe($parent->number);
    expect(ActivityLog::where('body', 'like', '%moved under issue #'.$parent->number.'%')->exists())->toBeTrue();
});
