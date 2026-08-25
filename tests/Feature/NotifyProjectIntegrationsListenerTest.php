<?php

use App\Events\CommentAdded;
use App\Events\IssueAssigned;
use App\Events\IssueUpdated;
use App\Jobs\SendWebhookNotificationJob;
use App\Listeners\NotifyProjectIntegrationsListener;
use App\Models\Comment;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->listener = app(NotifyProjectIntegrationsListener::class);
    Queue::fake();
});

test('it notifies an enabled discord integration opted into issue activity', function () {
    $project = Project::factory()->create();
    ProjectIntegration::create([
        'project_id' => $project->id,
        'integration' => 'discord',
        'enabled' => true,
        'webhook_url' => 'https://discord.com/api/webhooks/123456789012345678/aBcDeF',
        'options' => ['issue-activity' => true],
    ]);
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $actor = User::factory()->create();
    $assignee = User::factory()->create();

    $this->listener->handle(new IssueAssigned($issue, $assignee, $actor));

    Queue::assertPushed(SendWebhookNotificationJob::class);
});

test('it does not notify when the integration is disabled', function () {
    $project = Project::factory()->create();
    ProjectIntegration::create([
        'project_id' => $project->id,
        'integration' => 'discord',
        'enabled' => false,
        'webhook_url' => 'https://discord.com/api/webhooks/123456789012345678/aBcDeF',
        'options' => ['issue-activity' => true],
    ]);
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $actor = User::factory()->create();
    $assignee = User::factory()->create();

    $this->listener->handle(new IssueAssigned($issue, $assignee, $actor));

    Queue::assertNothingPushed();
});

test('it does not notify when the relevant sub-option is off', function () {
    $project = Project::factory()->create();
    ProjectIntegration::create([
        'project_id' => $project->id,
        'integration' => 'discord',
        'enabled' => true,
        'webhook_url' => 'https://discord.com/api/webhooks/123456789012345678/aBcDeF',
        'options' => ['issue-activity' => false, 'comment-activity' => true],
    ]);
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $actor = User::factory()->create();
    $assignee = User::factory()->create();

    $this->listener->handle(new IssueAssigned($issue, $assignee, $actor));

    Queue::assertNothingPushed();
});

test('it routes comment activity to the comment-activity sub-option, independently of issue-activity', function () {
    $project = Project::factory()->create();
    ProjectIntegration::create([
        'project_id' => $project->id,
        'integration' => 'discord',
        'enabled' => true,
        'webhook_url' => 'https://discord.com/api/webhooks/123456789012345678/aBcDeF',
        'options' => ['issue-activity' => false, 'comment-activity' => true],
    ]);
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $actor = User::factory()->create();
    $comment = Comment::factory()->create(['issue_id' => $issue->id, 'user_id' => $actor->id]);

    $this->listener->handle(new CommentAdded($comment, $issue, $actor));

    Queue::assertPushed(SendWebhookNotificationJob::class);
});

test('it does not notify a project with no integrations configured', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $actor = User::factory()->create();

    $this->listener->handle(new IssueUpdated($issue, $actor, [
        'status' => ['old' => 'open', 'new' => 'closed', 'text' => 'status changed'],
    ]));

    Queue::assertNothingPushed();
});

test('an integration for a different project is never notified', function () {
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    ProjectIntegration::create([
        'project_id' => $projectB->id,
        'integration' => 'discord',
        'enabled' => true,
        'webhook_url' => 'https://discord.com/api/webhooks/123456789012345678/aBcDeF',
        'options' => ['issue-activity' => true],
    ]);
    $issue = Issue::factory()->create(['project_id' => $projectA->id]);
    $actor = User::factory()->create();
    $assignee = User::factory()->create();

    $this->listener->handle(new IssueAssigned($issue, $assignee, $actor));

    Queue::assertNothingPushed();
});
