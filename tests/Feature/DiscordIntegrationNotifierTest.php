<?php

use App\Events\CommentAdded;
use App\Events\IssueAssigned;
use App\Events\IssueCreated;
use App\Events\IssueUnassigned;
use App\Events\IssueUpdated;
use App\Jobs\SendWebhookNotificationJob;
use App\Models\Comment;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Models\User;
use App\Services\Integrations\DiscordIntegrationNotifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->notifier = app(DiscordIntegrationNotifier::class);
    Queue::fake();

    $this->makeIntegration = fn (Project $project, ?string $webhookUrl = 'https://discord.com/api/webhooks/123456789012345678/aBcDeF') => ProjectIntegration::create([
        'project_id' => $project->id,
        'integration' => 'discord',
        'enabled' => true,
        'webhook_url' => $webhookUrl,
    ]);
});

test('it does nothing when the integration has no webhook url configured', function () {
    $project = Project::factory()->create();
    $integration = ($this->makeIntegration)($project, null);
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $actor = User::factory()->create();

    $this->notifier->handle($integration, new IssueUpdated($issue, $actor, [
        'status' => ['old' => 'open', 'new' => 'closed', 'text' => 'status changed to "closed"'],
    ]));

    Queue::assertNothingPushed();
});

test('it queues an embed for a new issue', function () {
    $project = Project::factory()->create();
    $integration = ($this->makeIntegration)($project);
    $issue = Issue::factory()->create(['id' => 15, 'project_id' => $project->id, 'title' => 'New feature']);
    $actor = User::factory()->create(['name' => 'Erin']);

    $this->notifier->handle($integration, new IssueCreated($issue, $actor));

    Queue::assertPushed(SendWebhookNotificationJob::class, function (SendWebhookNotificationJob $job) {
        $embed = $job->payload['embeds'][0];

        return $embed['color'] === 0x61FB2B
            && str_contains($embed['title'], '#15 created')
            && str_contains($embed['description'], 'Erin')
            && str_contains($embed['description'], 'New feature');
    });
});

test('it queues a green embed for an issue assignment', function () {
    $project = Project::factory()->create();
    $integration = ($this->makeIntegration)($project);
    $issue = Issue::factory()->create(['id' => 12, 'project_id' => $project->id, 'title' => 'Fix login bug']);
    $actor = User::factory()->create(['name' => 'Bob']);
    $assignee = User::factory()->create(['name' => 'Alice']);

    $this->notifier->handle($integration, new IssueAssigned($issue, $assignee, $actor));

    Queue::assertPushed(SendWebhookNotificationJob::class, function (SendWebhookNotificationJob $job) {
        $embed = $job->payload['embeds'][0];

        return $job->webhookUrl === 'https://discord.com/api/webhooks/123456789012345678/aBcDeF'
            && $embed['color'] === 0x57F287
            && str_contains($embed['title'], '#12 assigned')
            && str_contains($embed['description'], 'Alice')
            && str_contains($embed['description'], 'Fix login bug')
            && str_contains($embed['description'], 'Bob');
    });
});

test('it queues a gray embed for an issue unassignment', function () {
    $project = Project::factory()->create();
    $integration = ($this->makeIntegration)($project);
    $issue = Issue::factory()->create(['id' => 7, 'project_id' => $project->id, 'title' => 'Flaky test']);
    $actor = User::factory()->create(['name' => 'Bob']);
    $previousAssignee = User::factory()->create(['name' => 'Alice']);

    $this->notifier->handle($integration, new IssueUnassigned($issue, $previousAssignee, $actor));

    Queue::assertPushed(SendWebhookNotificationJob::class, function (SendWebhookNotificationJob $job) {
        $embed = $job->payload['embeds'][0];

        return $embed['color'] === 0x99AAB5
            && str_contains($embed['title'], '#7 unassigned')
            && str_contains($embed['description'], 'Alice')
            && str_contains($embed['description'], 'unassigned');
    });
});

test('it queues a blurple embed summarizing an issue update', function () {
    $project = Project::factory()->create();
    $integration = ($this->makeIntegration)($project);
    $issue = Issue::factory()->create(['id' => 9, 'project_id' => $project->id, 'title' => 'Search is slow']);
    $actor = User::factory()->create(['name' => 'Bob']);

    $this->notifier->handle($integration, new IssueUpdated($issue, $actor, [
        'status' => ['old' => 'open', 'new' => 'closed', 'text' => 'status changed from "open" to "closed"'],
    ]));

    Queue::assertPushed(SendWebhookNotificationJob::class, function (SendWebhookNotificationJob $job) {
        $embed = $job->payload['embeds'][0];

        return $embed['color'] === 0x5865F2
            && str_contains($embed['title'], '#9 updated')
            && str_contains($embed['description'], 'status changed from "open" to "closed"');
    });
});

test('it does not queue anything for an issue update with no actor', function () {
    $project = Project::factory()->create();
    $integration = ($this->makeIntegration)($project);
    $issue = Issue::factory()->create(['project_id' => $project->id]);

    $this->notifier->handle($integration, new IssueUpdated($issue, null, [
        'status' => ['old' => 'open', 'new' => 'closed', 'text' => 'status changed'],
    ]));

    Queue::assertNothingPushed();
});

test('it queues a fuchsia embed for a new comment', function () {
    $project = Project::factory()->create();
    $integration = ($this->makeIntegration)($project);
    $issue = Issue::factory()->create(['id' => 4, 'project_id' => $project->id, 'title' => 'Onboarding flow']);
    $actor = User::factory()->create(['name' => 'Jane Cooper']);
    $comment = Comment::factory()->create(['issue_id' => $issue->id, 'user_id' => $actor->id, 'body' => 'This looks great, thanks!']);

    $this->notifier->handle($integration, new CommentAdded($comment, $issue, $actor));

    Queue::assertPushed(SendWebhookNotificationJob::class, function (SendWebhookNotificationJob $job) {
        $embed = $job->payload['embeds'][0];

        return $embed['color'] === 0xEB459E
            && str_contains($embed['title'], '#4')
            && str_contains($embed['description'], 'Jane Cooper')
            && str_contains($embed['description'], 'This looks great, thanks!');
    });
});

test('every embed links back to the issue and is attributed to Orbit', function () {
    $project = Project::factory()->create();
    $integration = ($this->makeIntegration)($project);
    $issue = Issue::factory()->create(['id' => 3, 'project_id' => $project->id]);
    $actor = User::factory()->create();

    $this->notifier->handle($integration, new IssueUpdated($issue, $actor, [
        'status' => ['old' => 'open', 'new' => 'closed', 'text' => 'status changed'],
    ]));

    Queue::assertPushed(SendWebhookNotificationJob::class, function (SendWebhookNotificationJob $job) {
        $embed = $job->payload['embeds'][0];

        return $job->payload['username'] === 'Orbit'
            && $embed['footer']['text'] === 'Orbit'
            && str_contains($embed['url'], '?issue=3')
            && isset($embed['timestamp']);
    });
});
