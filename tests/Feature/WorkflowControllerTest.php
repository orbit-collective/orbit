<?php

use App\Enums\WorkflowStatusCategory;
use App\Models\IssueType;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkflowStatus;
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

    $transitionId = \App\Models\WorkflowTransition::query()->where('from_status_id', $from->id)->where('to_status_id', $to->id)->first()->id;

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
