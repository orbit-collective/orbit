<?php

use App\Enums\WorkflowStatusCategory;
use App\Models\Issue;
use App\Models\IssueType;
use App\Models\WorkflowStatus;
use App\Services\WorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = app(WorkflowService::class);
});

test('it can add a status to a workflow and logs the change', function () {
    $issueType = IssueType::factory()->create(['name' => 'Bug']);

    $status = $this->service->createStatus($issueType, ['name' => 'Blocked', 'color' => '#ef4444', 'category' => WorkflowStatusCategory::TODO]);

    $this->assertDatabaseHas('workflow_statuses', ['id' => $status->id, 'name' => 'Blocked']);
    $this->assertDatabaseHas('activity_logs', ['project_id' => $issueType->project_id, 'body' => 'Added the "Blocked" status to the "Bug" workflow']);
});

test('it rejects adding a status with a name already used in the workflow', function () {
    $issueType = IssueType::factory()->create();
    WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id, 'name' => 'Blocked']);

    $this->service->createStatus($issueType, ['name' => 'Blocked', 'color' => '#ef4444', 'category' => WorkflowStatusCategory::TODO]);
})->throws(ValidationException::class);

test('it can update a status and logs the change', function () {
    $issueType = IssueType::factory()->create(['name' => 'Bug']);
    $status = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id, 'name' => 'To Do']);

    $updated = $this->service->updateStatus($issueType, $status, ['name' => 'Backlog', 'color' => '#000000', 'category' => WorkflowStatusCategory::TODO]);

    expect($updated->name)->toBe('Backlog');
    $this->assertDatabaseHas('activity_logs', ['project_id' => $issueType->project_id, 'body' => 'Updated the "Backlog" status in the "Bug" workflow']);
});

test('it can delete an unused status, promoting the next status to initial if the initial one was removed', function () {
    $issueType = IssueType::factory()->create(['name' => 'Bug']);
    $initial = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id, 'name' => 'To Do', 'is_initial' => true, 'sort_order' => 0]);
    $second = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id, 'name' => 'Done', 'is_initial' => false, 'sort_order' => 1]);

    $this->service->deleteStatus($issueType, $initial);

    $this->assertDatabaseMissing('workflow_statuses', ['id' => $initial->id]);
    expect($second->refresh()->is_initial)->toBeTrue();
    $this->assertDatabaseHas('activity_logs', ['project_id' => $issueType->project_id, 'body' => 'Removed the "To Do" status from the "Bug" workflow']);
});

test('it refuses to delete the last remaining status of a workflow', function () {
    $issueType = IssueType::factory()->create();
    $status = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]);

    $this->service->deleteStatus($issueType, $status);
})->throws(ValidationException::class);

test('it refuses to delete a status still referenced by an issue', function () {
    $issueType = IssueType::factory()->create();
    WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]);
    $status = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]);
    Issue::factory()->create(['workflow_status_id' => $status->id]);

    $this->service->deleteStatus($issueType, $status);
})->throws(ValidationException::class);

test('it can add a transition between two statuses and logs the change', function () {
    $issueType = IssueType::factory()->create(['name' => 'Bug']);
    $from = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id, 'name' => 'To Do']);
    $to = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id, 'name' => 'Done']);

    $transition = $this->service->createTransition($issueType, $from, $to);

    $this->assertDatabaseHas('workflow_transitions', ['id' => $transition->id, 'from_status_id' => $from->id, 'to_status_id' => $to->id]);
    $this->assertDatabaseHas('activity_logs', ['project_id' => $issueType->project_id, 'body' => 'Added a transition from "To Do" to "Done" in the "Bug" workflow']);
});

test('a status cannot transition to itself', function () {
    $issueType = IssueType::factory()->create();
    $status = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]);

    $this->service->createTransition($issueType, $status, $status);
})->throws(ValidationException::class);

test('the same transition cannot be added twice', function () {
    $issueType = IssueType::factory()->create();
    $from = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]);
    $to = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]);
    $this->service->createTransition($issueType, $from, $to);

    $this->service->createTransition($issueType, $from, $to);
})->throws(ValidationException::class);

test('it can delete a transition and logs the change', function () {
    $issueType = IssueType::factory()->create(['name' => 'Bug']);
    $from = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id, 'name' => 'To Do']);
    $to = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id, 'name' => 'Done']);
    $transition = $this->service->createTransition($issueType, $from, $to);

    $this->service->deleteTransition($issueType, $transition);

    $this->assertDatabaseMissing('workflow_transitions', ['id' => $transition->id]);
    $this->assertDatabaseHas('activity_logs', ['project_id' => $issueType->project_id, 'body' => 'Removed the transition from "To Do" to "Done" in the "Bug" workflow']);
});
