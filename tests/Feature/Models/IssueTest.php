<?php

use App\Enums\IssueLabel;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
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
        'labels' => [IssueLabel::BUG],
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

test('labels are cast to an array of IssueLabel enum instances', function () {
    $issue = Issue::factory()->create(['labels' => [IssueLabel::BUG, IssueLabel::DESIGN]]);
    $fresh = $issue->fresh();

    expect($fresh->labels[0])->toBeInstanceOf(IssueLabel::class)
        ->and($fresh->labels[0]->value)->toBe('bug')
        ->and($fresh->labels[1]->value)->toBe('design');
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
