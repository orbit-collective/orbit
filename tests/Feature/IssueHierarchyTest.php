<?php

use App\Models\Project;
use App\Models\User;
use App\Services\IssueTypeService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function seedTypesFor(Project $project, User $user): void
{
    app(IssueTypeService::class)->ensureSystemIssueTypes($project);
}

test('an issue can be created as a sub-issue of an Epic', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    seedTypesFor($project, $member);
    $epicType = $project->issueTypes()->where('name', 'Epic')->first();
    $epic = $project->issues()->create([
        'title' => 'Big Epic', 'project_id' => $project->id, 'user_id' => $member->id,
        'issue_type_id' => $epicType->id, 'priority' => 'high', 'status' => 'open',
    ]);

    $response = $this->actingAs($member)->post('/issues', [
        'title' => 'Sub task',
        'project_id' => $project->id,
        'priority' => 'low',
        'status' => 'open',
        'parent_id' => $epic->id,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('issues', ['project_id' => $project->id, 'title' => 'Sub task', 'parent_id' => $epic->id]);
    $this->assertDatabaseHas('activity_logs', ['project_id' => $project->id, 'body' => "Issue #".$project->issues()->where('title', 'Sub task')->first()->id." added as a sub-issue of #$epic->id"]);
});

test('an issue cannot be created under a parent whose type does not allow children', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    seedTypesFor($project, $member);
    $taskType = $project->issueTypes()->where('name', 'Task')->first();
    $task = $project->issues()->create([
        'title' => 'A plain task', 'project_id' => $project->id, 'user_id' => $member->id,
        'issue_type_id' => $taskType->id, 'priority' => 'low', 'status' => 'open',
    ]);

    $response = $this->actingAs($member)->post('/issues', [
        'title' => 'Nested', 'project_id' => $project->id, 'priority' => 'low', 'status' => 'open', 'parent_id' => $task->id,
    ]);

    $response->assertSessionHasErrors('parent_id');
});

test('an issue cannot be created under a parent from another project', function () {
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    seedTypesFor($otherProject, $member);
    $epicType = $otherProject->issueTypes()->where('name', 'Epic')->first();
    $foreignEpic = $otherProject->issues()->create([
        'title' => 'Foreign Epic', 'project_id' => $otherProject->id, 'user_id' => $member->id,
        'issue_type_id' => $epicType->id, 'priority' => 'high', 'status' => 'open',
    ]);

    $response = $this->actingAs($member)->post('/issues', [
        'title' => 'Nested', 'project_id' => $project->id, 'priority' => 'low', 'status' => 'open', 'parent_id' => $foreignEpic->id,
    ]);

    $response->assertSessionHasErrors('parent_id');
});

test('an issue cannot be updated to become its own parent', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    seedTypesFor($project, $member);
    $taskType = $project->issueTypes()->where('name', 'Task')->first();
    $issue = $project->issues()->create([
        'title' => 'A task', 'project_id' => $project->id, 'user_id' => $member->id,
        'issue_type_id' => $taskType->id, 'priority' => 'low', 'status' => 'open',
    ]);

    $response = $this->actingAs($member)->patch("/issues/$issue->id", ['parent_id' => $issue->id]);

    $response->assertSessionHasErrors('parent_id');
});

test('an issue cannot be moved under its own descendant, preventing a cycle', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    seedTypesFor($project, $member);
    $epicType = $project->issueTypes()->where('name', 'Epic')->first();
    $epic = $project->issues()->create([
        'title' => 'Epic', 'project_id' => $project->id, 'user_id' => $member->id,
        'issue_type_id' => $epicType->id, 'priority' => 'high', 'status' => 'open',
    ]);
    $epic->update(['allows_children' => true]);
    $child = $project->issues()->create([
        'title' => 'Child', 'project_id' => $project->id, 'user_id' => $member->id,
        'issue_type_id' => $project->issueTypes()->where('name', 'Task')->first()->id,
        'priority' => 'low', 'status' => 'open', 'parent_id' => $epic->id,
    ]);
    // Make the epic type able to be nested by allowing it to be a child too, then try to invert the relationship.
    $epicType->update(['allows_children' => true]);

    $response = $this->actingAs($member)->patch("/issues/$epic->id", ['parent_id' => $child->id]);

    $response->assertSessionHasErrors('parent_id');
});

test('updating an issue to move it under a valid parent succeeds', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    seedTypesFor($project, $member);
    $epicType = $project->issueTypes()->where('name', 'Epic')->first();
    $epic = $project->issues()->create([
        'title' => 'Epic', 'project_id' => $project->id, 'user_id' => $member->id,
        'issue_type_id' => $epicType->id, 'priority' => 'high', 'status' => 'open',
    ]);
    $taskType = $project->issueTypes()->where('name', 'Task')->first();
    $issue = $project->issues()->create([
        'title' => 'Loose task', 'project_id' => $project->id, 'user_id' => $member->id,
        'issue_type_id' => $taskType->id, 'priority' => 'low', 'status' => 'open',
    ]);

    $response = $this->actingAs($member)->patch("/issues/$issue->id", ['parent_id' => $epic->id]);

    $response->assertRedirect();
    expect($issue->refresh()->parent_id)->toBe($epic->id);
});
