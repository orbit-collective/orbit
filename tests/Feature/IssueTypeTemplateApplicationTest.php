<?php

use App\Models\Project;
use App\Models\User;
use App\Services\IssueTypeService;
use App\Services\LabelService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function templateProject(): array
{
    $project = Project::factory()->create();
    $user = User::factory()->create();
    $project->users()->attach($user->id, ['role' => 'owner']);
    app(IssueTypeService::class)->ensureSystemIssueTypes($project);
    app(LabelService::class)->ensureSystemLabels($project);

    return [$project, $user];
}

test('a quick-added issue picks up its type template description and labels', function () {
    [$project, $user] = templateProject();
    $bug = $project->issueTypes()->where('name', 'Bug')->first();

    $this->actingAs($user)->post('/issues', [
        'title' => 'Login crashes', 'project_id' => $project->id,
        'priority' => 'medium', 'status' => 'open', 'issue_type_id' => $bug->id,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $issue = $project->issues()->where('title', 'Login crashes')->first();
    expect($issue->description)->toContain('Steps to reproduce')
        ->and($issue->labels)->toBe(['bug']);
});

test('a description supplied by the request wins over the template', function () {
    [$project, $user] = templateProject();
    $bug = $project->issueTypes()->where('name', 'Bug')->first();

    $this->actingAs($user)->post('/issues', [
        'title' => 'Login crashes', 'project_id' => $project->id,
        'priority' => 'medium', 'status' => 'open', 'issue_type_id' => $bug->id,
        'description' => 'My own write-up', 'labels' => ['feature'],
    ])->assertRedirect();

    $issue = $project->issues()->where('title', 'Login crashes')->first();
    expect($issue->description)->toBe('My own write-up')
        ->and($issue->labels)->toBe(['feature']);
});

test('a template label the project has deleted is dropped rather than rejected', function () {
    [$project, $user] = templateProject();
    $bug = $project->issueTypes()->where('name', 'Bug')->first();
    $project->labels()->where('name', 'bug')->delete();

    $this->actingAs($user)->post('/issues', [
        'title' => 'Login crashes', 'project_id' => $project->id,
        'priority' => 'medium', 'status' => 'open', 'issue_type_id' => $bug->id,
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($project->issues()->where('title', 'Login crashes')->first()->labels)->toBe([]);
});

test('every system type hands a new issue a description', function () {
    [$project, $user] = templateProject();

    foreach ($project->issueTypes()->where('is_top_level', true)->get() as $type) {
        $this->actingAs($user)->post('/issues', [
            'title' => "T {$type->name}", 'project_id' => $project->id,
            'priority' => 'medium', 'status' => 'open', 'issue_type_id' => $type->id,
        ])->assertRedirect();

        expect($project->issues()->where('title', "T {$type->name}")->first()->description)
            ->not->toBeEmpty("{$type->name} should start from its template");
    }
});

test('retyping an empty issue adopts the new type template', function () {
    [$project, $user] = templateProject();
    $task = $project->issueTypes()->where('name', 'Task')->first();
    $bug = $project->issueTypes()->where('name', 'Bug')->first();
    $issue = $project->issues()->create([
        'title' => 'Untouched', 'project_id' => $project->id, 'user_id' => $user->id,
        'issue_type_id' => $task->id, 'priority' => 'low', 'status' => 'open',
    ]);

    $this->actingAs($user)->patch("/issues/$issue->id", ['issue_type_id' => $bug->id])
        ->assertRedirect()->assertSessionHasNoErrors();

    expect($issue->refresh()->description)->toContain('Steps to reproduce');
});

test('retyping an issue someone has written up keeps their description', function () {
    [$project, $user] = templateProject();
    $task = $project->issueTypes()->where('name', 'Task')->first();
    $bug = $project->issueTypes()->where('name', 'Bug')->first();
    $issue = $project->issues()->create([
        'title' => 'Written up', 'project_id' => $project->id, 'user_id' => $user->id,
        'issue_type_id' => $task->id, 'priority' => 'low', 'status' => 'open',
        'description' => 'Carefully written notes',
    ]);

    $this->actingAs($user)->patch("/issues/$issue->id", ['issue_type_id' => $bug->id]);

    expect($issue->refresh()->description)->toBe('Carefully written notes');
});

test('retyping moves the issue onto the new type workflow and its statuses are selectable', function () {
    [$project, $user] = templateProject();
    $task = $project->issueTypes()->where('name', 'Task')->first();
    $bug = $project->issueTypes()->where('name', 'Bug')->first();
    $issue = $project->issues()->create([
        'title' => 'Retyped', 'project_id' => $project->id, 'user_id' => $user->id,
        'issue_type_id' => $task->id, 'priority' => 'low', 'status' => 'open',
        'workflow_status_id' => $task->statuses()->where('is_initial', true)->first()->id,
    ]);

    $this->actingAs($user)->patch("/issues/$issue->id", ['issue_type_id' => $bug->id]);
    $issue->refresh();

    expect($bug->statuses()->pluck('id')->all())->toContain($issue->workflow_status_id);

    // And a status further along the new workflow can then be picked.
    $triaged = $bug->statuses()->where('name', 'Triaged')->first();
    $this->actingAs($user)->patch("/issues/$issue->id", ['workflow_status_id' => $triaged->id])
        ->assertRedirect()->assertSessionHasNoErrors();

    expect($issue->refresh()->workflow_status_id)->toBe($triaged->id);
});
