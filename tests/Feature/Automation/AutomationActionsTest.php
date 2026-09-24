<?php

use App\Enums\Permissions\RoleType;
use App\Models\Issue;
use App\Models\IssueType;
use App\Models\Label;
use App\Models\Notification;
use App\Models\User;
use App\Models\WorkflowStatus;
use App\Services\Automation\Actions\AddLabelAction;
use App\Services\Automation\Actions\AssignUserAction;
use App\Services\Automation\Actions\ChangePriorityAction;
use App\Services\Automation\Actions\ChangeStatusAction;
use App\Services\Automation\Actions\RemoveLabelAction;
use App\Services\Automation\Actions\SendNotificationAction;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('ChangeStatusAction moves the issue to the target workflow status', function () {
    $issueType = IssueType::factory()->create();
    $status = WorkflowStatus::factory()->create(['issue_type_id' => $issueType->id, 'name' => 'Done']);
    $issue = Issue::factory()->create(['project_id' => $issueType->project_id, 'issue_type_id' => $issueType->id]);

    app(ChangeStatusAction::class)->handle($issue, ['workflow_status_id' => $status->id]);

    expect($issue->fresh()->workflow_status_id)->toBe($status->id);
});

test('ChangeStatusAction is a no-op when the status does not belong to the issue type', function () {
    $issueType = IssueType::factory()->create();
    $otherIssueType = IssueType::factory()->create();
    $foreignStatus = WorkflowStatus::factory()->create(['issue_type_id' => $otherIssueType->id]);
    $issue = Issue::factory()->create(['project_id' => $issueType->project_id, 'issue_type_id' => $issueType->id, 'workflow_status_id' => null]);

    app(ChangeStatusAction::class)->handle($issue, ['workflow_status_id' => $foreignStatus->id]);

    expect($issue->fresh()->workflow_status_id)->toBeNull();
});

test('ChangePriorityAction updates priority', function () {
    $issue = Issue::factory()->create(['priority' => 'low']);

    app(ChangePriorityAction::class)->handle($issue, ['priority' => 'high']);

    expect($issue->fresh()->priority)->toBe('high');
});

test('ChangePriorityAction ignores an invalid priority', function () {
    $issue = Issue::factory()->create(['priority' => 'low']);

    app(ChangePriorityAction::class)->handle($issue, ['priority' => 'urgent']);

    expect($issue->fresh()->priority)->toBe('low');
});

test('AssignUserAction assigns a project member', function () {
    $issue = Issue::factory()->create();
    $user = User::factory()->create();
    $issue->project->users()->attach($user->id, ['role' => RoleType::MEMBER->value]);

    app(AssignUserAction::class)->handle($issue, ['user_id' => $user->id]);

    expect($issue->fresh()->assignee_id)->toBe($user->id);
});

test('AssignUserAction ignores a user who is not a project member', function () {
    $issue = Issue::factory()->create(['assignee_id' => null]);
    $outsider = User::factory()->create();

    app(AssignUserAction::class)->handle($issue, ['user_id' => $outsider->id]);

    expect($issue->fresh()->assignee_id)->toBeNull();
});

test('AddLabelAction adds a real project label', function () {
    $issue = Issue::factory()->create(['labels' => []]);
    Label::query()->create(['project_id' => $issue->project_id, 'name' => 'bug', 'color' => '#f00']);

    app(AddLabelAction::class)->handle($issue, ['label' => 'bug']);

    expect($issue->fresh()->labels)->toBe(['bug']);
});

test('AddLabelAction ignores a label the project does not have', function () {
    $issue = Issue::factory()->create(['labels' => []]);

    app(AddLabelAction::class)->handle($issue, ['label' => 'nonexistent']);

    expect($issue->fresh()->labels)->toBe([]);
});

test('RemoveLabelAction removes an existing label', function () {
    $issue = Issue::factory()->create(['labels' => ['bug', 'urgent']]);

    app(RemoveLabelAction::class)->handle($issue, ['label' => 'bug']);

    expect($issue->fresh()->labels)->toBe(['urgent']);
});

test('SendNotificationAction notifies the assignee', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->create(['assignee_id' => $user->id]);

    app(SendNotificationAction::class)->handle($issue, ['title' => 'Heads up', 'message' => 'Automation ran.']);

    $this->assertDatabaseHas('notifications', [
        'user_id' => $user->id,
        'title' => 'Heads up',
    ]);
});

test('SendNotificationAction is a no-op without an assignee', function () {
    $issue = Issue::factory()->create(['assignee_id' => null]);

    app(SendNotificationAction::class)->handle($issue, ['title' => 'Heads up', 'message' => 'Automation ran.']);

    expect(Notification::query()->count())->toBe(0);
});
