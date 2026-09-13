<?php

use App\Enums\WorkflowStatusCategory;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkflowStatus;
use App\Models\WorkflowTransition;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('an admin can add a status to an issue type workflow', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);

    $response = $this->actingAs($admin)->post("/projects/$project->id/issue-types/$issueType->id/statuses", [
        'name' => 'Blocked',
        'color' => '#ef4444',
        'category' => 'todo',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('workflow_statuses', ['issue_type_id' => $issueType->id, 'name' => 'Blocked']);
});

test('a member without the workflow permission cannot add a status', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);

    $response = $this->actingAs($member)->post("/projects/$project->id/issue-types/$issueType->id/statuses", [
        'name' => 'Blocked',
        'color' => '#ef4444',
        'category' => 'todo',
    ]);

    $response->assertForbidden();
});

test('an issue type from another project cannot be used to add a status', function () {
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $otherProject->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);

    $response = $this->actingAs($admin)->post("/projects/$project->id/issue-types/$issueType->id/statuses", [
        'name' => 'Blocked',
        'color' => '#ef4444',
        'category' => 'todo',
    ]);

    $response->assertNotFound();
});

test('an admin can update a status', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);
    $status = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id, 'name' => 'To Do']);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/issue-types/$issueType->id/statuses/$status->id", [
        'name' => 'Backlog',
        'color' => '#000000',
        'category' => 'todo',
    ]);

    $response->assertRedirect();
    expect($status->refresh()->name)->toBe('Backlog');
});

test('a status from a different issue type cannot be updated through a mismatched type', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueTypeA = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);
    $issueTypeB = $project->issueTypes()->create(['name' => 'Feature', 'icon' => 'Sparkles', 'color' => '#2196f3']);
    $status = WorkflowStatus::factory()->create(['issue_type_id' => $issueTypeB->id]);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/issue-types/$issueTypeA->id/statuses/$status->id", [
        'name' => 'Backlog',
        'color' => '#000000',
        'category' => 'todo',
    ]);

    $response->assertNotFound();
});

test('an admin can delete an unused status', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);
    WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]);
    $status = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]);

    $response = $this->actingAs($admin)->delete("/projects/$project->id/issue-types/$issueType->id/statuses/$status->id");

    $response->assertRedirect();
    $this->assertDatabaseMissing('workflow_statuses', ['id' => $status->id]);
});

test('an admin can add and remove a transition between two statuses', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);
    $from = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]);
    $to = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]);

    $storeResponse = $this->actingAs($admin)->post("/projects/$project->id/issue-types/$issueType->id/transitions", [
        'from_status_id' => $from->id,
        'to_status_id' => $to->id,
    ]);
    $storeResponse->assertRedirect();
    $this->assertDatabaseHas('workflow_transitions', ['issue_type_id' => $issueType->id, 'from_status_id' => $from->id, 'to_status_id' => $to->id]);

    $transitionId = WorkflowTransition::query()->where('from_status_id', $from->id)->where('to_status_id', $to->id)->first()->id;

    $destroyResponse = $this->actingAs($admin)->delete("/projects/$project->id/issue-types/$issueType->id/transitions/$transitionId");
    $destroyResponse->assertRedirect();
    $this->assertDatabaseMissing('workflow_transitions', ['id' => $transitionId]);
});

test('a transition cannot reference a status belonging to a different issue type', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueTypeA = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);
    $issueTypeB = $project->issueTypes()->create(['name' => 'Feature', 'icon' => 'Sparkles', 'color' => '#2196f3']);
    $from = WorkflowStatus::factory()->create(['issue_type_id' => $issueTypeA->id]);
    $to = WorkflowStatus::factory()->create(['issue_type_id' => $issueTypeB->id]);

    $response = $this->actingAs($admin)->post("/projects/$project->id/issue-types/$issueTypeA->id/transitions", [
        'from_status_id' => $from->id,
        'to_status_id' => $to->id,
    ]);

    $response->assertSessionHasErrors('to_status_id');
});

test('guests cannot manage a project workflow', function () {
    $project = Project::factory()->create();
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);
    $status = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]);

    $response = $this->delete("/projects/$project->id/issue-types/$issueType->id/statuses/$status->id");

    $response->assertRedirect(route('login'));
});

test('an admin can pick which workflow status new issues start in', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);
    $first = WorkflowStatus::factory()->create([
        'issue_type_id' => $issueType->id, 'category' => WorkflowStatusCategory::TODO, 'is_initial' => true,
    ]);
    $second = WorkflowStatus::factory()->create([
        'issue_type_id' => $issueType->id, 'category' => WorkflowStatusCategory::IN_PROGRESS, 'is_initial' => false,
    ]);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/issue-types/$issueType->id/statuses/$second->id/initial");

    $response->assertRedirect();
    expect($second->refresh()->is_initial)->toBeTrue()
        ->and($first->refresh()->is_initial)->toBeFalse();
});

test('a member cannot change which workflow status is the starting one', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);
    $status = WorkflowStatus::factory()->create([
        'issue_type_id' => $issueType->id, 'category' => WorkflowStatusCategory::TODO, 'is_initial' => false,
    ]);

    $response = $this->actingAs($member)->patch("/projects/$project->id/issue-types/$issueType->id/statuses/$status->id/initial");

    $response->assertForbidden();
    expect($status->refresh()->is_initial)->toBeFalse();
});

test('an admin can reorder the statuses of a workflow', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);
    $first = WorkflowStatus::factory()->create([
        'issue_type_id' => $issueType->id, 'category' => WorkflowStatusCategory::TODO, 'sort_order' => 0,
    ]);
    $second = WorkflowStatus::factory()->create([
        'issue_type_id' => $issueType->id, 'category' => WorkflowStatusCategory::DONE, 'sort_order' => 1,
    ]);

    $response = $this->actingAs($admin)->patch(
        "/projects/$project->id/issue-types/$issueType->id/statuses/reorder",
        ['status_ids' => [$second->id, $first->id]],
    );

    $response->assertRedirect();
    expect($second->refresh()->sort_order)->toBe(0)
        ->and($first->refresh()->sort_order)->toBe(1);
});

test('reordering ignores status ids that belong to another issue type', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);
    $otherType = $project->issueTypes()->create(['name' => 'Task', 'icon' => 'SquareCheck', 'color' => '#3b82f6']);
    $own = WorkflowStatus::factory()->create([
        'issue_type_id' => $issueType->id, 'category' => WorkflowStatusCategory::TODO, 'sort_order' => 5,
    ]);
    $foreign = WorkflowStatus::factory()->create([
        'issue_type_id' => $otherType->id, 'category' => WorkflowStatusCategory::TODO, 'sort_order' => 9,
    ]);

    $response = $this->actingAs($admin)->patch(
        "/projects/$project->id/issue-types/$issueType->id/statuses/reorder",
        ['status_ids' => [$foreign->id, $own->id]],
    );

    $response->assertRedirect();
    expect($own->refresh()->sort_order)->toBe(0)
        ->and($foreign->refresh()->sort_order)->toBe(9);
});

test('a member cannot reorder a workflow', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);
    $status = WorkflowStatus::factory()->create([
        'issue_type_id' => $issueType->id, 'category' => WorkflowStatusCategory::TODO, 'sort_order' => 3,
    ]);

    $response = $this->actingAs($member)->patch(
        "/projects/$project->id/issue-types/$issueType->id/statuses/reorder",
        ['status_ids' => [$status->id]],
    );

    $response->assertForbidden();
    expect($status->refresh()->sort_order)->toBe(3);
});
