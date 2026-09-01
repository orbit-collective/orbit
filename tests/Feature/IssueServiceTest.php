<?php

use App\Enums\IssueLabel;
use App\Events\IssueAssigned;
use App\Events\IssueCreated;
use App\Events\IssueUnassigned;
use App\Events\IssueUpdated;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use App\Repositories\IssueRepository;
use App\Services\ActivityLogService;
use App\Services\IssueService;
use App\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->issueRepository = Mockery::mock(IssueRepository::class);
    $this->activityLogService = Mockery::mock(ActivityLogService::class);
    $this->userService = Mockery::mock(UserService::class);
    $this->userService->shouldReceive('getUserById')->andReturnUsing(fn ($id) => User::find($id));
    $this->service = new IssueService($this->issueRepository, $this->activityLogService, $this->userService);
    Event::fake();
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

test('getAllForProject delegates to the repository', function () {
    $issues = Issue::factory()->count(3)->make(['project_id' => 7]);

    $this->issueRepository->shouldReceive('getForProject')
        ->once()
        ->with(7, [], [])
        ->andReturn($issues);

    $result = $this->service->getAllForProject(7);

    expect($result)->toBe($issues);
});

test('getAllForProject passes search and filters through to the repository', function () {
    $issues = Issue::factory()->count(1)->make(['project_id' => 7]);
    $searchParams = ['search' => 'bug'];
    $filters = ['status' => ['open']];

    $this->issueRepository->shouldReceive('getForProject')
        ->once()
        ->with(7, $searchParams, $filters)
        ->andReturn($issues);

    $result = $this->service->getAllForProject(7, $searchParams, $filters);

    expect($result)->toBe($issues);
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

    $this->activityLogService->shouldReceive('log')
        ->once()
        ->with(1, 'Added new task: #123');

    $result = $this->service->createIssue($data);

    expect($result)->toBe($issue);
    Event::assertNotDispatched(IssueAssigned::class);
});

test('createIssue fires IssueCreated for every new issue', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $data = ['project_id' => 1, 'title' => 'New Issue'];
    $issue = new Issue(['id' => 42, 'project_id' => 1, 'title' => 'New Issue']);

    $this->issueRepository->shouldReceive('store')->once()->andReturn($issue);
    $this->activityLogService->shouldReceive('log')->once();

    $this->service->createIssue($data);

    Event::assertDispatched(
        IssueCreated::class,
        fn ($event) => $event->issue->is($issue) && $event->actor->is($user)
    );
});

test('createIssue fires IssueCreated even when the issue is also assigned', function () {
    $creator = User::factory()->create();
    $assignee = User::factory()->create(['name' => 'Alice']);
    $this->actingAs($creator);

    $data = ['project_id' => 5, 'title' => 'New Issue', 'assignee_id' => $assignee->id];
    $issue = new Issue(['id' => 42, 'project_id' => 5, 'title' => 'New Issue', 'assignee_id' => $assignee->id]);

    $this->issueRepository->shouldReceive('store')->once()->andReturn($issue);
    $this->activityLogService->shouldReceive('log')->once();

    $this->service->createIssue($data);

    Event::assertDispatched(IssueCreated::class, fn ($event) => $event->issue->is($issue));
    Event::assertDispatched(IssueAssigned::class, fn ($event) => $event->issue->is($issue));
});

test('it notifies the assignee when creating an issue assigned to someone else', function () {
    $creator = User::factory()->create();
    $assignee = User::factory()->create(['name' => 'Alice']);
    $this->actingAs($creator);

    $data = ['project_id' => 5, 'title' => 'New Issue', 'assignee_id' => $assignee->id];
    $issue = new Issue(['id' => 42, 'project_id' => 5, 'title' => 'New Issue', 'assignee_id' => $assignee->id]);

    $this->issueRepository->shouldReceive('store')->once()->andReturn($issue);
    $this->activityLogService->shouldReceive('log')->once();

    $this->service->createIssue($data);

    Event::assertDispatched(
        IssueAssigned::class,
        fn ($event) => $event->issue->is($issue)
            && $event->assignee->is($assignee)
            && $event->actor->is($creator)
            && $event->otherChanges === []
    );
});

test('it does not notify the creator when they assign the issue to themselves', function () {
    $creator = User::factory()->create();
    $this->actingAs($creator);

    $data = ['project_id' => 5, 'title' => 'New Issue', 'assignee_id' => $creator->id];
    $issue = new Issue(['id' => 42, 'project_id' => 5, 'title' => 'New Issue', 'assignee_id' => $creator->id]);

    $this->issueRepository->shouldReceive('store')->once()->andReturn($issue);
    $this->activityLogService->shouldReceive('log')->once();

    $this->service->createIssue($data);

    Event::assertNotDispatched(IssueAssigned::class);
});

test('updateIssue logs activity and fires IssueUpdated with the actor when there is no assignee', function () {
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

    $this->service->updateIssue($issue, ['status' => 'closed']);

    Event::assertDispatched(
        IssueUpdated::class,
        fn ($event) => $event->actor->is($actor)
            && $event->changes['status']['old'] === 'open'
            && $event->changes['status']['new'] === 'closed'
    );
    Event::assertNotDispatched(IssueAssigned::class);
    Event::assertNotDispatched(IssueUnassigned::class);
});

test('updateIssue fires IssueUpdated with the current assignee available when the assignee did not change', function () {
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

    $this->service->updateIssue($issue, ['status' => 'closed']);

    Event::assertDispatched(
        IssueUpdated::class,
        fn ($event) => $event->actor->is($actor)
            && $event->issue->assignee_id === $assignee->id
            && array_key_exists('status', $event->changes)
    );
});

test('updateIssue fires IssueUnassigned and IssueAssigned when the assignee is replaced', function () {
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

    $this->service->updateIssue($issue, ['assignee_id' => $newAssignee->id]);

    Event::assertDispatched(
        IssueUpdated::class,
        fn ($event) => $event->actor->is($actor) && array_key_exists('assignee_id', $event->changes)
    );

    Event::assertDispatched(
        IssueUnassigned::class,
        fn ($event) => $event->previousAssignee->is($oldAssignee) && $event->actor->is($actor)
    );

    Event::assertDispatched(
        IssueAssigned::class,
        fn ($event) => $event->assignee->is($newAssignee) && $event->actor->is($actor) && $event->otherChanges === []
    );
});

test('updateIssue does not fire IssueUnassigned when the previous assignee is the actor themself', function () {
    $actor = User::factory()->create();
    $newAssignee = User::factory()->create();
    $this->actingAs($actor);

    $project = Project::factory()->create();
    $issue = Issue::factory()->create([
        'project_id' => $project->id,
        'assignee_id' => $actor->id,
    ]);

    $this->issueRepository->shouldReceive('update')
        ->once()
        ->andReturnUsing(function ($issue, $data) {
            $issue->fill($data);
            $issue->syncOriginal();

            return $issue;
        });

    $this->activityLogService->shouldReceive('log')->once();

    $this->service->updateIssue($issue, ['assignee_id' => $newAssignee->id]);

    Event::assertNotDispatched(IssueUnassigned::class);
    Event::assertDispatched(IssueAssigned::class);
});

test('updateIssue does not fire IssueAssigned when the new assignee is the actor themself', function () {
    $actor = User::factory()->create();
    $oldAssignee = User::factory()->create();
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

    $this->service->updateIssue($issue, ['assignee_id' => $actor->id]);

    Event::assertDispatched(IssueUnassigned::class);
    Event::assertNotDispatched(IssueAssigned::class);
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

    $this->service->updateIssue($issue, ['description' => 'A brand new description']);

    Event::assertDispatched(
        IssueUpdated::class,
        fn ($event) => $event->changes['description']['text'] === 'description was updated'
    );
});

test('updateIssue quotes assignee names in the logged body, escaping any embedded quotes', function () {
    $actor = User::factory()->create();
    $this->actingAs($actor);
    $newAssignee = User::factory()->create(['name' => 'Bob "The Builder" Smith']);

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
        ->with($project->id, Mockery::on(fn ($body) => str_contains(
            $body,
            'assignee changed from "Unassigned" to "Bob \\"The Builder\\" Smith"'
        )));

    $this->service->updateIssue($issue, ['assignee_id' => $newAssignee->id]);
});

test('updateIssue reports a priority change in the IssueUpdated payload', function () {
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

    $this->service->updateIssue($issue, ['priority' => 'high']);

    Event::assertDispatched(
        IssueUpdated::class,
        fn ($event) => $event->changes['priority']['old'] === 'low'
            && $event->changes['priority']['new'] === 'high'
    );
});

test('updateIssue reports both changed fields in a single IssueUpdated payload when multiple unrelated fields change', function () {
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

    $this->service->updateIssue($issue, ['status' => 'closed', 'priority' => 'high']);

    Event::assertDispatched(
        IssueUpdated::class,
        fn ($event) => array_key_exists('status', $event->changes) && array_key_exists('priority', $event->changes)
    );
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

    $this->service->updateIssue($issue, ['labels' => [IssueLabel::BUG]]);

    Event::assertDispatched(
        IssueUpdated::class,
        fn ($event) => $event->changes['labels']['text'] === 'labels changed to [bug]'
    );
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

    $this->service->updateIssue($issue, ['labels' => null]);

    Event::assertDispatched(
        IssueUpdated::class,
        fn ($event) => $event->changes['labels']['text'] === 'labels changed to [none]'
    );
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

    $this->service->updateIssue($issue, ['start_date' => null, 'end_date' => null]);

    Event::assertDispatched(
        IssueUpdated::class,
        fn ($event) => $event->changes['start_date']['text'] === 'start date changed to none'
            && $event->changes['end_date']['text'] === 'end date changed to none'
    );
});

test('updateIssue passes the remaining changes as otherChanges on the new assignee\'s IssueAssigned event', function () {
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

    $this->service->updateIssue($issue, ['assignee_id' => $newAssignee->id, 'title' => 'New title']);

    Event::assertDispatched(
        IssueAssigned::class,
        fn ($event) => $event->assignee->is($newAssignee)
            && array_key_exists('title', $event->otherChanges)
            && ! array_key_exists('assignee_id', $event->otherChanges)
    );
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

test('updateIssue does not log or fire any event when nothing actually changed', function () {
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

    $this->service->updateIssue($issue, ['status' => 'open']);

    Event::assertNotDispatched(IssueUpdated::class);
});
