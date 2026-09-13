<?php

use App\Models\Issue;
use App\Models\IssueType;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkflowStatus;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a factory-created issue persists with the expected attribute types', function () {
    $issue = Issue::factory()->create();

    expect($issue->exists)->toBeTrue()
        ->and($issue->title)->toBeString()
        ->and($issue->status)->toBeIn(['open', 'closed'])
        ->and($issue->priority)->toBeIn(['low', 'medium', 'high']);
});

test('mass assignment via fillable creates an issue', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();

    $issue = Issue::create([
        'title' => 'New issue',
        'description' => 'Body',
        'status' => 'open',
        'priority' => 'high',
        'project_id' => $project->id,
        'user_id' => $user->id,
        'labels' => ['bug'],
    ]);

    $this->assertDatabaseHas('issues', [
        'id' => $issue->id,
        'title' => 'New issue',
        'project_id' => $project->id,
        'user_id' => $user->id,
    ]);
});

test('creator() belongs to the user referenced by user_id', function () {
    $creator = User::factory()->create();
    $issue = Issue::factory()->create(['user_id' => $creator->id]);

    expect($issue->creator())->toBeInstanceOf(BelongsTo::class)
        ->and($issue->creator->id)->toBe($creator->id);
});

test('assignee() belongs to the user referenced by assignee_id', function () {
    $assignee = User::factory()->create();
    $issue = Issue::factory()->create(['assignee_id' => $assignee->id]);

    expect($issue->assignee())->toBeInstanceOf(BelongsTo::class)
        ->and($issue->assignee->id)->toBe($assignee->id);
});

test('assignee is null when assignee_id is not set', function () {
    $issue = Issue::factory()->create(['assignee_id' => null]);

    expect($issue->assignee)->toBeNull();
});

test('project() belongs to the project referenced by project_id', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);

    expect($issue->project())->toBeInstanceOf(BelongsTo::class)
        ->and($issue->project->id)->toBe($project->id);
});

test('issueType() belongs to the issue type referenced by issue_type_id', function () {
    $issueType = IssueType::factory()->create();
    $issue = Issue::factory()->create(['issue_type_id' => $issueType->id]);

    expect($issue->issueType())->toBeInstanceOf(BelongsTo::class)
        ->and($issue->issueType->id)->toBe($issueType->id);
});

test('workflowStatus() belongs to the workflow status referenced by workflow_status_id', function () {
    $status = WorkflowStatus::factory()->create();
    $issue = Issue::factory()->create(['workflow_status_id' => $status->id]);

    expect($issue->workflowStatus())->toBeInstanceOf(BelongsTo::class)
        ->and($issue->workflowStatus->id)->toBe($status->id);
});

test('labels are cast to a plain array of label name strings', function () {
    $issue = Issue::factory()->create(['labels' => ['bug', 'design']]);
    $fresh = $issue->fresh();

    expect($fresh->labels)->toBe(['bug', 'design']);
});

test('labels persist as an empty set when none are given', function () {
    $issue = Issue::factory()->create(['labels' => []]);

    expect($issue->fresh()->labels)->toHaveCount(0);
});

test('deleting a project cascades to delete its issues', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);

    $project->delete();

    $this->assertDatabaseMissing('issues', ['id' => $issue->id]);
});

test('deleting the creator cascades to delete their issues', function () {
    $creator = User::factory()->create();
    $issue = Issue::factory()->create(['user_id' => $creator->id]);

    $creator->delete();

    $this->assertDatabaseMissing('issues', ['id' => $issue->id]);
});

test('deleting the assignee sets assignee_id to null instead of deleting the issue', function () {
    $assignee = User::factory()->create();
    $issue = Issue::factory()->create(['assignee_id' => $assignee->id]);

    $assignee->delete();

    $this->assertDatabaseHas('issues', ['id' => $issue->id, 'assignee_id' => null]);
});

test('creating an issue with an end date before the start date is rejected', function () {
    Issue::factory()->create([
        'start_date' => now(),
        'end_date' => now()->subDay(),
    ]);
})->throws(QueryException::class);

test('updating an issue to have an end date before the start date is rejected', function () {
    $issue = Issue::factory()->create([
        'start_date' => now(),
        'end_date' => now()->addDay(),
    ]);

    $issue->update(['end_date' => now()->subDay()]);
})->throws(QueryException::class);

test('an end date equal to the start date is allowed', function () {
    $sameDay = now()->startOfDay();

    $issue = Issue::factory()->create([
        'start_date' => $sameDay,
        'end_date' => $sameDay,
    ]);

    $this->assertDatabaseHas('issues', ['id' => $issue->id]);
});

test('an issue without start or end dates is allowed', function () {
    $issue = Issue::factory()->create([
        'start_date' => null,
        'end_date' => null,
    ]);

    $this->assertDatabaseHas('issues', ['id' => $issue->id]);
});

test('an issue serializes its type and workflow status under camelCase relation keys', function () {
    $project = Project::factory()->create();
    app(App\Services\IssueTypeService::class)->ensureSystemIssueTypes($project);
    $issueType = $project->issueTypes()->where('name', 'Epic')->first();
    $issue = Issue::factory()->create([
        'project_id' => $project->id,
        'issue_type_id' => $issueType->id,
        'workflow_status_id' => $issueType->statuses()->first()->id,
    ]);

    $array = $issue->load(['issueType', 'workflowStatus'])->toArray();

    expect($array)->toHaveKeys(['issueType', 'workflowStatus'])
        ->and($array)->not->toHaveKeys(['issue_type', 'workflow_status'])
        ->and($array['issueType']['allowsChildren'])->toBeTrue()
        ->and($array['workflowStatus'])->toHaveKeys(['isInitial', 'issueTypeId', 'category']);
});
