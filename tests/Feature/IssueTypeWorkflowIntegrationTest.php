<?php

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkflowTransition;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('creating an issue without an issue_type_id defaults to the Task system type and maps status to the matching workflow status', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($member)->post('/issues', [
        'title' => 'Fix the thing',
        'project_id' => $project->id,
        'priority' => 'medium',
        'status' => 'in_progress',
    ]);

    $response->assertRedirect();
    $taskType = $project->issueTypes()->where('name', 'Task')->first();
    $inProgress = $taskType->statuses()->where('category', 'in_progress')->first();
    $this->assertDatabaseHas('issues', [
        'project_id' => $project->id,
        'title' => 'Fix the thing',
        'issue_type_id' => $taskType->id,
        'workflow_status_id' => $inProgress->id,
    ]);
});

test('creating an issue with an explicit issue_type_id assigns that type and its matching workflow status', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    // Seed the catalog first so the Bug type exists to reference.
    $this->actingAs($member)->post('/issues', ['title' => 'seed', 'project_id' => $project->id, 'priority' => 'low', 'status' => 'open']);
    $bugType = $project->issueTypes()->where('name', 'Bug')->first();

    $response = $this->actingAs($member)->post('/issues', [
        'title' => 'Something broke',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
        'issue_type_id' => $bugType->id,
    ]);

    $response->assertRedirect();
    $todo = $bugType->statuses()->where('category', 'todo')->first();
    $this->assertDatabaseHas('issues', [
        'project_id' => $project->id,
        'title' => 'Something broke',
        'issue_type_id' => $bugType->id,
        'workflow_status_id' => $todo->id,
    ]);
});

test('an issue type restricted to certain role types blocks a member outside those roles from creating it', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $restrictedType = $project->issueTypes()->create([
        'name' => 'Security',
        'icon' => 'Shield',
        'color' => '#b91c1c',
        'restricted_role_types' => [RoleType::OWNER->value, RoleType::ADMIN->value],
    ]);

    $response = $this->actingAs($member)->post('/issues', [
        'title' => 'Sensitive report',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
        'issue_type_id' => $restrictedType->id,
    ]);

    $response->assertForbidden();
    $this->assertDatabaseMissing('issues', ['project_id' => $project->id, 'title' => 'Sensitive report']);
});

test('an owner can create an issue of a role-restricted type', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);
    $restrictedType = $project->issueTypes()->create([
        'name' => 'Security',
        'icon' => 'Shield',
        'color' => '#b91c1c',
        'restricted_role_types' => [RoleType::OWNER->value],
    ]);

    $response = $this->actingAs($owner)->post('/issues', [
        'title' => 'Sensitive report',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
        'issue_type_id' => $restrictedType->id,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('issues', ['project_id' => $project->id, 'title' => 'Sensitive report', 'issue_type_id' => $restrictedType->id]);
});

test('updating status moves the workflow_status_id to the matching status of the issue\'s current type', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $this->actingAs($member)->post('/issues', ['title' => 'A task', 'project_id' => $project->id, 'priority' => 'low', 'status' => 'open']);
    $issue = $project->issues()->first();
    $taskType = $project->issueTypes()->where('name', 'Task')->first();
    $done = $taskType->statuses()->where('category', 'done')->first();

    $response = $this->actingAs($member)->patch("/issues/$issue->id", ['status' => 'closed']);

    $response->assertRedirect();
    expect($issue->refresh()->workflow_status_id)->toBe($done->id);
});

test('updating status to a value with no transition defined in the workflow is rejected', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $this->actingAs($member)->post('/issues', ['title' => 'A task', 'project_id' => $project->id, 'priority' => 'low', 'status' => 'open']);
    $issue = $project->issues()->first();
    $taskType = $project->issueTypes()->where('name', 'Task')->first();
    // Remove every transition into the Done status so no path there exists.
    WorkflowTransition::query()->where('issue_type_id', $taskType->id)
        ->where('to_status_id', $taskType->statuses()->where('category', 'done')->first()->id)
        ->delete();

    $response = $this->actingAs($member)->patch("/issues/$issue->id", ['status' => 'closed']);

    $response->assertSessionHasErrors('status');
});

test('updating issue_type_id moves the issue to the new type and resets its workflow status to the new type\'s initial status', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $this->actingAs($member)->post('/issues', ['title' => 'A task', 'project_id' => $project->id, 'priority' => 'low', 'status' => 'closed']);
    $issue = $project->issues()->first();
    $bugType = $project->issueTypes()->where('name', 'Bug')->first();

    $response = $this->actingAs($member)->patch("/issues/$issue->id", ['issue_type_id' => $bugType->id]);

    $response->assertRedirect();
    $issue->refresh();
    expect($issue->issue_type_id)->toBe($bugType->id)
        ->and($issue->workflow_status_id)->toBe($bugType->statuses()->where('is_initial', true)->first()->id);
});

test('a member cannot move an issue into a role-restricted issue type', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $this->actingAs($member)->post('/issues', ['title' => 'A task', 'project_id' => $project->id, 'priority' => 'low', 'status' => 'open']);
    $issue = $project->issues()->first();
    $restrictedType = $project->issueTypes()->create([
        'name' => 'Confidential',
        'icon' => 'Shield',
        'color' => '#b91c1c',
        'restricted_role_types' => [RoleType::OWNER->value],
    ]);

    $response = $this->actingAs($member)->patch("/issues/$issue->id", ['issue_type_id' => $restrictedType->id]);

    $response->assertForbidden();
});

test('creating an issue of a type with required fields rejects a request missing one', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $this->actingAs($member)->post('/issues', ['title' => 'seed', 'project_id' => $project->id, 'priority' => 'low', 'status' => 'open']);
    $bugType = $project->issueTypes()->where('name', 'Bug')->first();
    $bugType->update(['required_fields' => ['description', 'assignee']]);

    $response = $this->actingAs($member)->post('/issues', [
        'title' => 'Missing fields',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
        'issue_type_id' => $bugType->id,
    ]);

    $response->assertSessionHasErrors(['description', 'assignee_id']);
    $this->assertDatabaseMissing('issues', ['project_id' => $project->id, 'title' => 'Missing fields']);
});

test('creating an issue satisfying its type\'s required fields succeeds', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $this->actingAs($member)->post('/issues', ['title' => 'seed', 'project_id' => $project->id, 'priority' => 'low', 'status' => 'open']);
    $bugType = $project->issueTypes()->where('name', 'Bug')->first();
    $bugType->update(['required_fields' => ['description']]);

    $response = $this->actingAs($member)->post('/issues', [
        'title' => 'Has description',
        'description' => 'Steps to reproduce',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
        'issue_type_id' => $bugType->id,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('issues', ['project_id' => $project->id, 'title' => 'Has description']);
});

test('updating an issue to clear a field required by its type is rejected', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $this->actingAs($member)->post('/issues', ['title' => 'seed', 'project_id' => $project->id, 'priority' => 'low', 'status' => 'open']);
    $bugType = $project->issueTypes()->where('name', 'Bug')->first();
    $bugType->update(['required_fields' => ['description']]);
    $this->actingAs($member)->post('/issues', [
        'title' => 'Has description', 'description' => 'x', 'project_id' => $project->id,
        'priority' => 'high', 'status' => 'open', 'issue_type_id' => $bugType->id,
    ]);
    $issue = $project->issues()->where('title', 'Has description')->first();

    $response = $this->actingAs($member)->patch("/issues/$issue->id", ['description' => '']);

    $response->assertSessionHasErrors('description');
});

test('creating an issue with a template_id prefills description and labels when not provided', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $this->actingAs($member)->post('/issues', ['title' => 'seed', 'project_id' => $project->id, 'priority' => 'low', 'status' => 'open']);
    $bugType = $project->issueTypes()->where('name', 'Bug')->first();
    $template = $bugType->templates()->create([
        'name' => 'Standard Bug Report',
        'description' => 'Steps to reproduce...',
        'default_labels' => ['bug'],
    ]);

    $response = $this->actingAs($member)->post('/issues', [
        'title' => 'Login fails',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
        'issue_type_id' => $bugType->id,
        'template_id' => $template->id,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('issues', [
        'project_id' => $project->id,
        'title' => 'Login fails',
        'description' => 'Steps to reproduce...',
    ]);
    expect($project->issues()->where('title', 'Login fails')->first()->labels)->toBe(['bug']);
});
