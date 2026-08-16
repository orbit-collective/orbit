<?php

use App\Enums\IssueLabel;
use App\Enums\Notifications\NotificationType;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use App\Repositories\IssueRepository;
use App\Services\ActivityLogService;
use App\Services\IssueService;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->issueRepository = Mockery::mock(IssueRepository::class);
    $this->activityLogService = Mockery::mock(ActivityLogService::class);
    $this->notificationService = Mockery::mock(NotificationService::class);
    $this->service = new IssueService($this->issueRepository, $this->activityLogService, $this->notificationService);
});

test('getIssueWithRelations delegates to the repository', function () {
    $issue = Issue::factory()->make(['id' => 42]);

    $this->issueRepository->shouldReceive('findWithRelations')
        ->once()
        ->with(42)
        ->andReturn($issue);

    $result = $this->service->getIssueWithRelations(42);

    expect($result)->toBe($issue);
});

test('it can create an issue and log activity', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $data = ['project_id' => 1, 'title' => 'Test Issue'];
    $issue = new Issue(['id' => 123, 'project_id' => 1, 'title' => 'Test Issue']);

    $this->issueRepository->shouldReceive('store')
        ->once()
        ->with(Mockery::on(function ($arg) use ($user) {
            return $arg['project_id'] === 1 && $arg['user_id'] === $user->id;
        }))
        ->andReturn($issue);

    // This expectation will fail if my suspicion about #{$issue} is correct, and it returns the whole object stringified
    $this->activityLogService->shouldReceive('log')
        ->once()
        ->with(1, 'Added new task: #123');

    $result = $this->service->createIssue($data);

    expect($result)->toBe($issue);
});

test('it notifies the assignee when creating an issue assigned to someone else', function () {
    $creator = User::factory()->create();
    $assignee = User::factory()->create(['name' => 'Alice']);
    $this->actingAs($creator);

    $data = ['project_id' => 5, 'title' => 'New Issue', 'assignee_id' => $assignee->id];
    $issue = new Issue(['id' => 42, 'project_id' => 5, 'title' => 'New Issue', 'assignee_id' => $assignee->id]);

    $this->issueRepository->shouldReceive('store')->once()->andReturn($issue);
    $this->activityLogService->shouldReceive('log')->once();

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $assignee->id,
            NotificationType::IssueAssigned,
            'info',
            'You were assigned to an issue',
            Mockery::on(fn ($message) => str_contains($message, 'assigned you to "New Issue" (#42)')),
            Mockery::on(fn ($url) => str_contains($url, '/projects/5?issue=42'))
        );

    $this->service->createIssue($data);
});

test('it does not notify the creator when they assign the issue to themselves', function () {
    $creator = User::factory()->create();
    $this->actingAs($creator);

    $data = ['project_id' => 5, 'title' => 'New Issue', 'assignee_id' => $creator->id];
    $issue = new Issue(['id' => 42, 'project_id' => 5, 'title' => 'New Issue', 'assignee_id' => $creator->id]);

    $this->issueRepository->shouldReceive('store')->once()->andReturn($issue);
    $this->activityLogService->shouldReceive('log')->once();

    $this->notificationService->shouldNotReceive('notify');

    $this->service->createIssue($data);
});

test('updateIssue logs activity and notifies only the actor when there is no assignee', function () {
    $actor = User::factory()->create();
    $this->actingAs($actor);

    $project = Project::factory()->create();
    $issue = Issue::factory()->create([
        'project_id' => $project->id,
        'assignee_id' => null,
        'title' => 'Bug report',
        'status' => 'open',
    ]);

    $this->issueRepository->shouldReceive('update')
        ->once()
        ->andReturnUsing(function ($issue, $data) {
            $issue->fill($data);
            $issue->syncOriginal();

            return $issue;
        });

    $this->activityLogService->shouldReceive('log')
        ->once()
        ->with($project->id, Mockery::on(fn ($body) => str_contains($body, 'status changed from "open" to "closed"')));

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $actor->id,
            NotificationType::IssueStatusChanged,
            'info',
            "Issue #{$issue->id} status changed",
            Mockery::on(fn ($message) => str_contains($message, 'status changed from "open" to "closed"')),
            Mockery::any()
        );

    $this->service->updateIssue($issue, ['status' => 'closed']);
});

test('updateIssue also notifies the current assignee when they are not the actor', function () {
    $actor = User::factory()->create(['name' => 'Bob']);
    $assignee = User::factory()->create(['name' => 'Alice']);
    $this->actingAs($actor);

    $project = Project::factory()->create();
    $issue = Issue::factory()->create([
        'project_id' => $project->id,
        'assignee_id' => $assignee->id,
        'status' => 'open',
    ]);

    $this->issueRepository->shouldReceive('update')
        ->once()
        ->andReturnUsing(function ($issue, $data) {
            $issue->fill($data);
            $issue->syncOriginal();

            return $issue;
        });

    $this->activityLogService->shouldReceive('log')->once();

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with($actor->id, NotificationType::IssueStatusChanged, 'info', Mockery::any(), Mockery::any(), Mockery::any());

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $assignee->id,
            NotificationType::IssueStatusChanged,
            'info',
            "Issue #{$issue->id} status changed",
            Mockery::on(fn ($message) => str_contains($message, 'Bob updated') && str_contains($message, 'assigned to you')),
            Mockery::any()
        );

    $this->service->updateIssue($issue, ['status' => 'closed']);
});

test('updateIssue notifies the newly assigned user and the previously assigned user', function () {
    $actor = User::factory()->create(['name' => 'Bob']);
    $oldAssignee = User::factory()->create(['name' => 'Alice']);
    $newAssignee = User::factory()->create(['name' => 'Carol']);
    $this->actingAs($actor);

    $project = Project::factory()->create();
    $issue = Issue::factory()->create([
        'project_id' => $project->id,
        'assignee_id' => $oldAssignee->id,
    ]);

    $this->issueRepository->shouldReceive('update')
        ->once()
        ->andReturnUsing(function ($issue, $data) {
            $issue->fill($data);
            $issue->syncOriginal();

            return $issue;
        });

    $this->activityLogService->shouldReceive('log')->once();

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with($actor->id, NotificationType::IssueUpdated, 'info', Mockery::any(), Mockery::any(), Mockery::any());

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $oldAssignee->id,
            NotificationType::IssueAssigned,
            'info',
            'You were unassigned from an issue',
            Mockery::on(fn ($message) => str_contains($message, 'Bob unassigned you')),
            Mockery::any()
        );

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $newAssignee->id,
            NotificationType::IssueAssigned,
            'info',
            'You were assigned to an issue',
            Mockery::on(fn ($message) => str_contains($message, 'Bob assigned you')),
            Mockery::any()
        );

    $this->service->updateIssue($issue, ['assignee_id' => $newAssignee->id]);
});

test('updateIssue describes a description-only change', function () {
    $actor = User::factory()->create();
    $this->actingAs($actor);

    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => null]);

    $this->issueRepository->shouldReceive('update')
        ->once()
        ->andReturnUsing(function ($issue, $data) {
            $issue->fill($data);
            $issue->syncOriginal();

            return $issue;
        });

    $this->activityLogService->shouldReceive('log')
        ->once()
        ->with($project->id, Mockery::on(fn ($body) => str_contains($body, 'description was updated')));

    $this->notificationService->shouldReceive('notify')->once();

    $this->service->updateIssue($issue, ['description' => 'A brand new description']);
});

test('updateIssue notifies with IssuePriorityChanged when only the priority changes', function () {
    $actor = User::factory()->create();
    $this->actingAs($actor);

    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => null, 'priority' => 'low']);

    $this->issueRepository->shouldReceive('update')
        ->once()
        ->andReturnUsing(function ($issue, $data) {
            $issue->fill($data);
            $issue->syncOriginal();

            return $issue;
        });

    $this->activityLogService->shouldReceive('log')->once();

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $actor->id,
            NotificationType::IssuePriorityChanged,
            'info',
            "Issue #{$issue->id} priority changed",
            Mockery::on(fn ($message) => str_contains($message, 'priority changed from "low" to "high"')),
            Mockery::any()
        );

    $this->service->updateIssue($issue, ['priority' => 'high']);
});

test('updateIssue notifies with IssueLabelsChanged when only labels change', function () {
    $actor = User::factory()->create();
    $this->actingAs($actor);

    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => null, 'labels' => []]);

    $this->issueRepository->shouldReceive('update')
        ->once()
        ->andReturnUsing(function ($issue, $data) {
            $issue->fill($data);
            $issue->syncOriginal();

            return $issue;
        });

    $this->activityLogService->shouldReceive('log')->once();

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $actor->id,
            NotificationType::IssueLabelsChanged,
            'info',
            "Issue #{$issue->id} labels updated",
            Mockery::any(),
            Mockery::any()
        );

    $this->service->updateIssue($issue, ['labels' => [IssueLabel::BUG]]);
});

test('updateIssue notifies with IssueDatesChanged, grouping start and end date together', function () {
    $actor = User::factory()->create();
    $this->actingAs($actor);

    $project = Project::factory()->create();
    $issue = Issue::factory()->create([
        'project_id' => $project->id,
        'assignee_id' => null,
        'start_date' => now(),
        'end_date' => now()->addDay(),
    ]);

    $this->issueRepository->shouldReceive('update')
        ->once()
        ->andReturnUsing(function ($issue, $data) {
            $issue->fill($data);
            $issue->syncOriginal();

            return $issue;
        });

    $this->activityLogService->shouldReceive('log')->once();

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $actor->id,
            NotificationType::IssueDatesChanged,
            'info',
            "Issue #{$issue->id} schedule updated",
            Mockery::on(fn ($message) => str_contains($message, 'start date changed to none')
                && str_contains($message, 'end date changed to none')),
            Mockery::any()
        );

    $this->service->updateIssue($issue, ['start_date' => null, 'end_date' => null]);
});

test('updateIssue sends one notification per changed category when multiple unrelated fields change', function () {
    $actor = User::factory()->create();
    $this->actingAs($actor);

    $project = Project::factory()->create();
    $issue = Issue::factory()->create([
        'project_id' => $project->id,
        'assignee_id' => null,
        'priority' => 'low',
        'status' => 'open',
    ]);

    $this->issueRepository->shouldReceive('update')
        ->once()
        ->andReturnUsing(function ($issue, $data) {
            $issue->fill($data);
            $issue->syncOriginal();

            return $issue;
        });

    $this->activityLogService->shouldReceive('log')->once();

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with($actor->id, NotificationType::IssueStatusChanged, 'info', Mockery::any(), Mockery::any(), Mockery::any());

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with($actor->id, NotificationType::IssuePriorityChanged, 'info', Mockery::any(), Mockery::any(), Mockery::any());

    $this->service->updateIssue($issue, ['status' => 'closed', 'priority' => 'high']);
});

test('updateIssue describes labels changing to a non-empty set', function () {
    $actor = User::factory()->create();
    $this->actingAs($actor);

    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => null, 'labels' => []]);

    $this->issueRepository->shouldReceive('update')
        ->once()
        ->andReturnUsing(function ($issue, $data) {
            $issue->fill($data);
            $issue->syncOriginal();

            return $issue;
        });

    $this->activityLogService->shouldReceive('log')
        ->once()
        ->with($project->id, Mockery::on(fn ($body) => str_contains($body, 'labels changed to [bug]')));

    $this->notificationService->shouldReceive('notify')->once();

    $this->service->updateIssue($issue, ['labels' => [IssueLabel::BUG]]);
});

test('updateIssue describes labels being cleared as "none"', function () {
    $actor = User::factory()->create();
    $this->actingAs($actor);

    $project = Project::factory()->create();
    $issue = Issue::factory()->create([
        'project_id' => $project->id,
        'assignee_id' => null,
        'labels' => [IssueLabel::BUG],
    ]);

    $this->issueRepository->shouldReceive('update')
        ->once()
        ->andReturnUsing(function ($issue, $data) {
            $issue->fill($data);
            $issue->syncOriginal();

            return $issue;
        });

    $this->activityLogService->shouldReceive('log')
        ->once()
        ->with($project->id, Mockery::on(fn ($body) => str_contains($body, 'labels changed to [none]')));

    $this->notificationService->shouldReceive('notify')->once();

    $this->service->updateIssue($issue, ['labels' => null]);
});

test('updateIssue describes start_date and end_date changes, including clearing them', function () {
    $actor = User::factory()->create();
    $this->actingAs($actor);

    $project = Project::factory()->create();
    $issue = Issue::factory()->create([
        'project_id' => $project->id,
        'assignee_id' => null,
        'start_date' => now(),
        'end_date' => now()->addDay(),
    ]);

    $this->issueRepository->shouldReceive('update')
        ->once()
        ->andReturnUsing(function ($issue, $data) {
            $issue->fill($data);
            $issue->syncOriginal();

            return $issue;
        });

    $this->activityLogService->shouldReceive('log')
        ->once()
        ->with($project->id, Mockery::on(fn ($body) => str_contains($body, 'start date changed to none')
            && str_contains($body, 'end date changed to none')));

    $this->notificationService->shouldReceive('notify')->once();

    $this->service->updateIssue($issue, ['start_date' => null, 'end_date' => null]);
});

test('updateIssue appends other changes to the new assignee\'s notification message', function () {
    $actor = User::factory()->create(['name' => 'Bob']);
    $newAssignee = User::factory()->create(['name' => 'Carol']);
    $this->actingAs($actor);

    $project = Project::factory()->create();
    $issue = Issue::factory()->create([
        'project_id' => $project->id,
        'assignee_id' => null,
        'title' => 'Old title',
    ]);

    $this->issueRepository->shouldReceive('update')
        ->once()
        ->andReturnUsing(function ($issue, $data) {
            $issue->fill($data);
            $issue->syncOriginal();

            return $issue;
        });

    $this->activityLogService->shouldReceive('log')->once();

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with($actor->id, NotificationType::IssueUpdated, 'info', Mockery::any(), Mockery::any(), Mockery::any());

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $newAssignee->id,
            NotificationType::IssueAssigned,
            'info',
            'You were assigned to an issue',
            Mockery::on(fn ($message) => str_contains($message, 'assigned you to')
                && str_contains($message, 'Also:')
                && str_contains($message, 'title changed to "New title"')),
            Mockery::any()
        );

    $this->service->updateIssue($issue, ['assignee_id' => $newAssignee->id, 'title' => 'New title']);
});

test('deleteIssue calls the repository delete and logs activity', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'title' => 'Old bug']);

    $this->issueRepository->shouldReceive('delete')
        ->once()
        ->with($issue);

    $this->activityLogService->shouldReceive('log')
        ->once()
        ->with($project->id, "Deleted issue #$issue->id \"Old bug\"");

    $this->service->deleteIssue($issue);
});

test('bulkDeleteIssues calls the repository bulkDelete with the given ids and logs one entry per deleted issue', function () {
    $project = Project::factory()->create();
    $ids = [1, 2, 3];
    $issues = collect([
        (object) ['id' => 1, 'project_id' => $project->id, 'title' => 'Bug one'],
        (object) ['id' => 2, 'project_id' => $project->id, 'title' => 'Bug two'],
        (object) ['id' => 3, 'project_id' => $project->id, 'title' => 'Bug three'],
    ]);

    $this->issueRepository->shouldReceive('getMany')
        ->once()
        ->with($ids)
        ->andReturn($issues);

    $this->issueRepository->shouldReceive('bulkDelete')
        ->once()
        ->with($ids);

    foreach ($issues as $issue) {
        $this->activityLogService->shouldReceive('log')
            ->once()
            ->with($project->id, "Deleted issue #$issue->id \"$issue->title\"");
    }

    $this->service->bulkDeleteIssues($ids);
});

test('updateIssue does not log or notify anything when nothing actually changed', function () {
    $actor = User::factory()->create();
    $this->actingAs($actor);

    $project = Project::factory()->create();
    $issue = Issue::factory()->create([
        'project_id' => $project->id,
        'assignee_id' => null,
        'status' => 'open',
    ]);

    $this->issueRepository->shouldReceive('update')
        ->once()
        ->andReturnUsing(function ($issue, $data) {
            $issue->fill($data);

            return $issue;
        });

    $this->activityLogService->shouldNotReceive('log');
    $this->notificationService->shouldNotReceive('notify');

    $this->service->updateIssue($issue, ['status' => 'open']);
});
