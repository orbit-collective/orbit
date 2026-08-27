<?php

use App\Enums\Notifications\NotificationType;
use App\Events\CommentAdded;
use App\Events\IssueAssigned;
use App\Events\IssueUnassigned;
use App\Events\IssueUpdated;
use App\Events\ProjectInvited;
use App\Listeners\SendNotificationListener;
use App\Models\Comment;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\User;
use App\Notifications\ProjectInvitationMail;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->notificationService = Mockery::mock(NotificationService::class);
    $this->listener = new SendNotificationListener($this->notificationService);
});

test('IssueAssigned notifies the new assignee with no "Also" suffix when there are no other changes', function () {
    $actor = User::factory()->create(['name' => 'Bob']);
    $assignee = User::factory()->create();
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['id' => 10, 'project_id' => $project->id, 'title' => 'Fix bug', 'assignee_id' => $assignee->id]);

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $assignee->id,
            NotificationType::IssueAssigned,
            'info',
            'You were assigned to an issue',
            'Bob assigned you to "Fix bug" (#10).',
            route('projects.show', $project->id).'?issue=10'
        );

    $this->listener->handle(new IssueAssigned($issue, $assignee, $actor));
});

test('IssueAssigned appends the remaining changes to the message when otherChanges is not empty', function () {
    $actor = User::factory()->create(['name' => 'Bob']);
    $assignee = User::factory()->create();
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['id' => 10, 'project_id' => $project->id, 'title' => 'Fix bug', 'assignee_id' => $assignee->id]);

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $assignee->id,
            NotificationType::IssueAssigned,
            'info',
            'You were assigned to an issue',
            Mockery::on(fn ($message) => str_contains($message, 'assigned you to') && str_contains($message, 'Also: title changed to "New title"')),
            Mockery::any()
        );

    $this->listener->handle(new IssueAssigned($issue, $assignee, $actor, [
        'title' => ['old' => 'Old title', 'new' => 'New title', 'text' => 'title changed to "New title"'],
    ]));
});

test('IssueAssigned falls back to "Someone" when there is no actor', function () {
    $assignee = User::factory()->create();
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $assignee->id]);

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with($assignee->id, NotificationType::IssueAssigned, 'info', Mockery::any(), Mockery::on(fn ($m) => str_starts_with($m, 'Someone assigned you')), Mockery::any());

    $this->listener->handle(new IssueAssigned($issue, $assignee, null));
});

test('IssueUnassigned notifies the previous assignee', function () {
    $actor = User::factory()->create(['name' => 'Bob']);
    $previousAssignee = User::factory()->create();
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['id' => 11, 'project_id' => $project->id, 'title' => 'Fix bug']);

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $previousAssignee->id,
            NotificationType::IssueAssigned,
            'info',
            'You were unassigned from an issue',
            'Bob unassigned you from "Fix bug" (#11).',
            route('projects.show', $project->id).'?issue=11'
        );

    $this->listener->handle(new IssueUnassigned($issue, $previousAssignee, $actor));
});

test('IssueUpdated notifies the actor with the notification type mapped from the changed field', function () {
    $actor = User::factory()->create();
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['id' => 12, 'project_id' => $project->id, 'assignee_id' => null]);

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $actor->id,
            NotificationType::IssueStatusChanged,
            'info',
            'Issue #12 status changed',
            Mockery::on(fn ($message) => str_contains($message, 'status changed from "open" to "closed"')),
            route('projects.show', $project->id).'?issue=12'
        );

    $this->listener->handle(new IssueUpdated($issue, $actor, [
        'status' => ['old' => 'open', 'new' => 'closed', 'text' => 'status changed from "open" to "closed"'],
    ]));
});

test('IssueUpdated falls back to the generic IssueUpdated type for untracked fields', function () {
    $actor = User::factory()->create();
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['id' => 13, 'project_id' => $project->id, 'assignee_id' => null]);

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with($actor->id, NotificationType::IssueUpdated, 'info', 'Issue #13 updated', Mockery::any(), Mockery::any());

    $this->listener->handle(new IssueUpdated($issue, $actor, [
        'description' => ['old' => null, 'new' => 'new text', 'text' => 'description was updated'],
    ]));
});

test('IssueUpdated sends one notification per notification type when unrelated fields change together', function () {
    $actor = User::factory()->create();
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['id' => 14, 'project_id' => $project->id, 'assignee_id' => null]);

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with($actor->id, NotificationType::IssueStatusChanged, 'info', Mockery::any(), Mockery::any(), Mockery::any());

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with($actor->id, NotificationType::IssuePriorityChanged, 'info', Mockery::any(), Mockery::any(), Mockery::any());

    $this->listener->handle(new IssueUpdated($issue, $actor, [
        'status' => ['old' => 'open', 'new' => 'closed', 'text' => 'status changed'],
        'priority' => ['old' => 'low', 'new' => 'high', 'text' => 'priority changed'],
    ]));
});

test('IssueUpdated groups start_date and end_date under the same IssueDatesChanged notification', function () {
    $actor = User::factory()->create();
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['id' => 15, 'project_id' => $project->id, 'assignee_id' => null]);

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $actor->id,
            NotificationType::IssueDatesChanged,
            'info',
            'Issue #15 schedule updated',
            Mockery::on(fn ($m) => str_contains($m, 'start date changed to none') && str_contains($m, 'end date changed to none')),
            Mockery::any()
        );

    $this->listener->handle(new IssueUpdated($issue, $actor, [
        'start_date' => ['old' => now(), 'new' => null, 'text' => 'start date changed to none'],
        'end_date' => ['old' => now(), 'new' => null, 'text' => 'end date changed to none'],
    ]));
});

test('IssueUpdated also notifies the current assignee when the assignee did not change', function () {
    $actor = User::factory()->create(['name' => 'Bob']);
    $assignee = User::factory()->create();
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['id' => 16, 'project_id' => $project->id, 'assignee_id' => $assignee->id]);

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with($actor->id, NotificationType::IssueStatusChanged, 'info', Mockery::any(), Mockery::any(), Mockery::any());

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $assignee->id,
            NotificationType::IssueStatusChanged,
            'info',
            'Issue #16 status changed',
            Mockery::on(fn ($m) => str_contains($m, 'Bob updated') && str_contains($m, 'assigned to you')),
            Mockery::any()
        );

    $this->listener->handle(new IssueUpdated($issue, $actor, [
        'status' => ['old' => 'open', 'new' => 'closed', 'text' => 'status changed'],
    ]));
});

test('IssueUpdated does not notify the assignee track when the assignee just changed', function () {
    $actor = User::factory()->create();
    $newAssignee = User::factory()->create();
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['id' => 17, 'project_id' => $project->id, 'assignee_id' => $newAssignee->id]);

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with($actor->id, NotificationType::IssueUpdated, 'info', Mockery::any(), Mockery::any(), Mockery::any());

    $this->listener->handle(new IssueUpdated($issue, $actor, [
        'assignee_id' => ['old' => null, 'new' => $newAssignee->id, 'text' => 'assignee changed'],
    ]));
});

test('IssueUpdated does nothing when there is no actor', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);

    $this->notificationService->shouldNotReceive('notify');

    $this->listener->handle(new IssueUpdated($issue, null, [
        'status' => ['old' => 'open', 'new' => 'closed', 'text' => 'status changed'],
    ]));
});

test('CommentAdded notifies the issue assignee', function () {
    $actor = User::factory()->create(['name' => 'Jane Cooper']);
    $assignee = User::factory()->create();
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['id' => 20, 'project_id' => $project->id, 'title' => 'Fix login crash', 'assignee_id' => $assignee->id]);
    $comment = Comment::factory()->create(['issue_id' => $issue->id, 'user_id' => $actor->id]);

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $assignee->id,
            NotificationType::IssueCommented,
            'info',
            'New comment on your issue',
            'Jane Cooper commented on "Fix login crash" (#20).',
            route('issues.show', [$project->id, $issue->id])
        );

    $this->listener->handle(new CommentAdded($comment, $issue, $actor));
});

test('CommentAdded does not notify when the commenter is the assignee', function () {
    $assignee = User::factory()->create();
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $assignee->id]);
    $comment = Comment::factory()->create(['issue_id' => $issue->id, 'user_id' => $assignee->id]);

    $this->notificationService->shouldNotReceive('notify');

    $this->listener->handle(new CommentAdded($comment, $issue, $assignee));
});

test('CommentAdded does not notify when the issue has no assignee', function () {
    $actor = User::factory()->create();
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => null]);
    $comment = Comment::factory()->create(['issue_id' => $issue->id, 'user_id' => $actor->id]);

    $this->notificationService->shouldNotReceive('notify');

    $this->listener->handle(new CommentAdded($comment, $issue, $actor));
});

test('ProjectInvited notifies an existing user through the normal notification pipeline', function () {
    $invitedBy = User::factory()->create(['name' => 'Bob']);
    $existingUser = User::factory()->create();
    $project = Project::factory()->create(['name' => 'Orbit']);
    $invitation = ProjectInvitation::create([
        'project_id' => $project->id,
        'invited_by' => $invitedBy->id,
        'email' => 'invitee@example.com',
        'token' => 'test-token',
        'role' => 'member',
        'expires_at' => now()->addDays(7),
    ]);

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $existingUser->id,
            NotificationType::ProjectInvited,
            'info',
            'You were invited to a project',
            'Bob invited you to join "Orbit".',
            'https://example.com/accept'
        );

    $this->listener->handle(new ProjectInvited($invitation, $project, $invitedBy, $existingUser, 'https://example.com/accept'));
});

test('ProjectInvited sends the dedicated invitation email when there is no existing user', function () {
    Notification::fake();

    $invitedBy = User::factory()->create();
    $project = Project::factory()->create();
    $invitation = ProjectInvitation::create([
        'project_id' => $project->id,
        'invited_by' => $invitedBy->id,
        'email' => 'stranger@example.com',
        'token' => 'another-test-token',
        'role' => 'member',
        'expires_at' => now()->addDays(7),
    ]);

    $this->notificationService->shouldNotReceive('notify');

    $this->listener->handle(new ProjectInvited($invitation, $project, $invitedBy, null, 'https://example.com/accept'));

    Notification::assertSentOnDemand(ProjectInvitationMail::class);
});
