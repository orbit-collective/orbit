<?php

use App\Jobs\SendWebhookNotificationJob;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Models\User;
use App\Services\CommentService;
use App\Services\IssueService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

test('assigning an issue queues a discord webhook end to end when the integration is fully configured', function () {
    Queue::fake();
    $project = Project::factory()->create();
    ProjectIntegration::create([
        'project_id' => $project->id,
        'integration' => 'discord',
        'enabled' => true,
        'webhook_url' => 'https://discord.com/api/webhooks/123456789012345678/aBcDeF',
        'options' => ['issue-activity' => true],
    ]);
    $creator = User::factory()->create();
    $assignee = User::factory()->create(['name' => 'Alice']);
    $this->actingAs($creator);

    app(IssueService::class)->createIssue([
        'project_id' => $project->id,
        'title' => 'Fix the checkout flow',
        'assignee_id' => $assignee->id,
    ]);

    Queue::assertPushed(SendWebhookNotificationJob::class, fn (SendWebhookNotificationJob $job) => str_contains($job->payload['embeds'][0]['description'], 'Alice'));
});

test('creating an issue queues a discord webhook end to end for the creation itself', function () {
    Queue::fake();
    $project = Project::factory()->create();
    ProjectIntegration::create([
        'project_id' => $project->id,
        'integration' => 'discord',
        'enabled' => true,
        'webhook_url' => 'https://discord.com/api/webhooks/123456789012345678/aBcDeF',
        'options' => ['issue-activity' => true],
    ]);
    $creator = User::factory()->create(['name' => 'Dave']);
    $this->actingAs($creator);

    app(IssueService::class)->createIssue([
        'project_id' => $project->id,
        'title' => 'Improve onboarding',
    ]);

    Queue::assertPushed(SendWebhookNotificationJob::class, fn (SendWebhookNotificationJob $job) => str_contains($job->payload['embeds'][0]['title'], 'created')
        && str_contains($job->payload['embeds'][0]['description'], 'Dave'));
});

test('commenting on an issue queues a discord webhook end to end when comment-activity is enabled', function () {
    Queue::fake();
    $project = Project::factory()->create();
    ProjectIntegration::create([
        'project_id' => $project->id,
        'integration' => 'discord',
        'enabled' => true,
        'webhook_url' => 'https://discord.com/api/webhooks/123456789012345678/aBcDeF',
        'options' => ['comment-activity' => true],
    ]);
    $assignee = User::factory()->create();
    $commenter = User::factory()->create(['name' => 'Jane Cooper']);
    $issue = Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $assignee->id]);
    $this->actingAs($commenter);

    app(CommentService::class)->addComment($issue, ['body' => 'Looks good to me!']);

    Queue::assertPushed(SendWebhookNotificationJob::class, fn (SendWebhookNotificationJob $job) => str_contains($job->payload['embeds'][0]['description'], 'Jane Cooper'));
});

test('the webhook fires even when the commenter is the issue assignee', function () {
    // Regression test: the webhook used to piggyback on the same
    // "notify the assignee" gating as in-app notifications, so a comment
    // from the assignee themself (or on an unassigned issue) silently
    // never reached Discord.
    Queue::fake();
    $project = Project::factory()->create();
    ProjectIntegration::create([
        'project_id' => $project->id,
        'integration' => 'discord',
        'enabled' => true,
        'webhook_url' => 'https://discord.com/api/webhooks/123456789012345678/aBcDeF',
        'options' => ['comment-activity' => true],
    ]);
    $assignee = User::factory()->create(['name' => 'Alice']);
    $issue = Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $assignee->id]);
    $this->actingAs($assignee);

    app(CommentService::class)->addComment($issue, ['body' => 'Done!']);

    Queue::assertPushed(SendWebhookNotificationJob::class, fn (SendWebhookNotificationJob $job) => str_contains($job->payload['embeds'][0]['description'], 'Alice'));
});

test('the webhook fires for a comment on an issue with no assignee', function () {
    Queue::fake();
    $project = Project::factory()->create();
    ProjectIntegration::create([
        'project_id' => $project->id,
        'integration' => 'discord',
        'enabled' => true,
        'webhook_url' => 'https://discord.com/api/webhooks/123456789012345678/aBcDeF',
        'options' => ['comment-activity' => true],
    ]);
    $commenter = User::factory()->create(['name' => 'Bob']);
    $issue = Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => null]);
    $this->actingAs($commenter);

    app(CommentService::class)->addComment($issue, ['body' => 'First!']);

    Queue::assertPushed(SendWebhookNotificationJob::class, fn (SendWebhookNotificationJob $job) => str_contains($job->payload['embeds'][0]['description'], 'Bob'));
});

test('a status change always fires the webhook, regardless of who made it or who is assigned', function () {
    Queue::fake();
    $project = Project::factory()->create();
    ProjectIntegration::create([
        'project_id' => $project->id,
        'integration' => 'discord',
        'enabled' => true,
        'webhook_url' => 'https://discord.com/api/webhooks/123456789012345678/aBcDeF',
        'options' => ['issue-activity' => true],
    ]);
    $assignee = User::factory()->create();
    $someoneElse = User::factory()->create(['name' => 'Carol']);
    $issue = Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $assignee->id, 'status' => 'open']);
    $this->actingAs($someoneElse);

    app(IssueService::class)->updateIssue($issue, ['status' => 'closed']);

    Queue::assertPushed(SendWebhookNotificationJob::class, fn (SendWebhookNotificationJob $job) => str_contains($job->payload['embeds'][0]['description'], 'status changed'));
});

test('self-assigning an issue still fires the webhook via the general update embed', function () {
    // IssueAssigned itself is skipped when someone assigns an issue to
    // themself (no "you were assigned" notification makes sense there),
    // but the assignment is still part of IssueUpdated's change set, so
    // the activity should still reach Discord — just as a generic
    // "updated" embed rather than the dedicated "assigned" one.
    Queue::fake();
    $project = Project::factory()->create();
    ProjectIntegration::create([
        'project_id' => $project->id,
        'integration' => 'discord',
        'enabled' => true,
        'webhook_url' => 'https://discord.com/api/webhooks/123456789012345678/aBcDeF',
        'options' => ['issue-activity' => true],
    ]);
    $actor = User::factory()->create(['name' => 'Dave']);
    $issue = Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => null]);
    $this->actingAs($actor);

    app(IssueService::class)->updateIssue($issue, ['assignee_id' => $actor->id]);

    Queue::assertPushed(SendWebhookNotificationJob::class, fn (SendWebhookNotificationJob $job) => str_contains($job->payload['embeds'][0]['title'], 'updated'));
});

test('nothing is queued when the project has no integration configured', function () {
    Queue::fake();
    $project = Project::factory()->create();
    $creator = User::factory()->create();
    $assignee = User::factory()->create();
    $this->actingAs($creator);

    app(IssueService::class)->createIssue([
        'project_id' => $project->id,
        'title' => 'Some issue',
        'assignee_id' => $assignee->id,
    ]);

    Queue::assertNothingPushed();
});
