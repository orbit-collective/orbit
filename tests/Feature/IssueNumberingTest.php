<?php

use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
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
    DB::table('projects')->where('id', $project->id)->update(['next_issue_number' => 1]);

    $issue = Issue::factory()->create(['project_id' => $project->id]);

    expect($issue->number)->toBe(201);
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
