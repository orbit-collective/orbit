<?php

use App\Enums\WorkflowStatusCategory;
use App\Models\IssueType;
use App\Repositories\WorkflowRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = new WorkflowRepository;
});

test('it can create, list and update workflow statuses for an issue type ordered by sort order', function () {
    $issueType = IssueType::factory()->create();

    $this->repository->createStatus($issueType, ['name' => 'Done', 'color' => '#22c55e', 'category' => WorkflowStatusCategory::DONE, 'sort_order' => 1]);
    $todo = $this->repository->createStatus($issueType, ['name' => 'To Do', 'color' => '#94a3b8', 'category' => WorkflowStatusCategory::TODO, 'sort_order' => 0]);

    $statuses = $this->repository->getStatusesForType($issueType);

    expect($statuses->pluck('name')->all())->toBe(['To Do', 'Done']);

    $this->repository->updateStatus($todo, ['color' => '#000000']);
    expect($todo->refresh()->color)->toBe('#000000');
});

test('it can create, list and delete transitions between statuses', function () {
    $issueType = IssueType::factory()->create();
    $todo = $this->repository->createStatus($issueType, ['name' => 'To Do', 'color' => '#94a3b8', 'category' => WorkflowStatusCategory::TODO]);
    $done = $this->repository->createStatus($issueType, ['name' => 'Done', 'color' => '#22c55e', 'category' => WorkflowStatusCategory::DONE]);

    $transition = $this->repository->createTransition($issueType, $todo, $done);

    expect($this->repository->transitionExists($issueType, $todo->id, $done->id))->toBeTrue()
        ->and($this->repository->transitionExists($issueType, $done->id, $todo->id))->toBeFalse()
        ->and($this->repository->getTransitionsForType($issueType))->toHaveCount(1);

    $this->repository->deleteTransition($transition);

    expect($this->repository->getTransitionsForType($issueType))->toHaveCount(0);
});

test('deleting a workflow status removes it', function () {
    $issueType = IssueType::factory()->create();
    $status = $this->repository->createStatus($issueType, ['name' => 'To Do', 'color' => '#94a3b8', 'category' => WorkflowStatusCategory::TODO]);

    $this->repository->deleteStatus($status);

    $this->assertDatabaseMissing('workflow_statuses', ['id' => $status->id]);
});
