<?php

use App\Models\IssueType;
use App\Models\WorkflowStatus;
use App\Models\WorkflowTransition;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a factory-created workflow transition persists and links from/to statuses', function () {
    $transition = WorkflowTransition::factory()->create();

    expect($transition->exists)->toBeTrue()
        ->and($transition->fromStatus())->toBeInstanceOf(BelongsTo::class)
        ->and($transition->toStatus())->toBeInstanceOf(BelongsTo::class)
        ->and($transition->issueType())->toBeInstanceOf(BelongsTo::class);
});

test('the same from/to status pair cannot be transitioned twice', function () {
    $issueType = IssueType::factory()->create();
    $from = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]);
    $to = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]);

    WorkflowTransition::factory()->create([
        'issue_type_id' => $issueType->id,
        'from_status_id' => $from->id,
        'to_status_id' => $to->id,
    ]);

    WorkflowTransition::factory()->create([
        'issue_type_id' => $issueType->id,
        'from_status_id' => $from->id,
        'to_status_id' => $to->id,
    ]);
})->throws(QueryException::class);

test('deleting a workflow status cascades to delete its transitions', function () {
    $issueType = IssueType::factory()->create();
    $from = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]);
    $to = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]);

    $transition = WorkflowTransition::factory()->create([
        'issue_type_id' => $issueType->id,
        'from_status_id' => $from->id,
        'to_status_id' => $to->id,
    ]);

    $from->delete();

    expect(WorkflowTransition::find($transition->id))->toBeNull();
});
