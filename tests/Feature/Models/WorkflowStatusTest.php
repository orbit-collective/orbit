<?php

use App\Enums\WorkflowStatusCategory;
use App\Models\Issue;
use App\Models\IssueType;
use App\Models\WorkflowStatus;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a factory-created workflow status persists with the expected attribute types', function () {
    $status = WorkflowStatus::factory()->create();

    expect($status->exists)->toBeTrue()
        ->and($status->name)->toBeString()
        ->and($status->color)->toBeString()
        ->and($status->category)->toBeInstanceOf(WorkflowStatusCategory::class)
        ->and($status->is_initial)->toBeBool();
});

test('issueType() belongs to the issue type referenced by issue_type_id', function () {
    $issueType = IssueType::factory()->create();
    $status = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]);

    expect($status->issueType())->toBeInstanceOf(BelongsTo::class)
        ->and($status->issueType->id)->toBe($issueType->id);
});

test('the initial factory state marks a status as the initial todo status', function () {
    $status = WorkflowStatus::factory()->initial()->create();

    expect($status->is_initial)->toBeTrue()
        ->and($status->category)->toBe(WorkflowStatusCategory::TODO);
});

test('transitionsFrom(), transitionsTo() and issues() are has-many relations', function () {
    $status = WorkflowStatus::factory()->create();

    expect($status->transitionsFrom())->toBeInstanceOf(HasMany::class)
        ->and($status->transitionsTo())->toBeInstanceOf(HasMany::class)
        ->and($status->issues())->toBeInstanceOf(HasMany::class);
});

test('deleting an issue type cascades to delete its workflow statuses', function () {
    $issueType = IssueType::factory()->create();
    $status = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id]);

    $issueType->delete();

    expect(WorkflowStatus::find($status->id))->toBeNull();
});

test('an issue type cannot have two workflow statuses with the same name', function () {
    $issueType = IssueType::factory()->create();
    WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id, 'name' => 'To Do']);

    WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id, 'name' => 'To Do']);
})->throws(QueryException::class);

test('a workflow status referenced by an issue cannot be deleted at the database level', function () {
    $status = WorkflowStatus::factory()->create();
    Issue::factory()->create(['workflow_status_id' => $status->id]);

    $status->delete();
})->throws(QueryException::class);
