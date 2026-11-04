<?php

use App\Events\Live\AccessChanged;
use App\Events\Live\NotificationsChanged;
use App\Events\Live\ProjectChanged;
use App\Models\Comment;
use App\Models\Issue;
use App\Models\IssueType;
use App\Models\Label;
use App\Models\Notification;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkflowStatus;
use App\Models\WorkflowTransition;
use App\Repositories\IssueRepository;
use App\Repositories\ProjectMemberRepository;
use App\Repositories\RoleRepository;
use App\Services\NotificationService;
use App\Support\Live\LiveUpdates;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['live.enabled' => true]);
    Event::fake([ProjectChanged::class, AccessChanged::class, NotificationsChanged::class]);
});

test('nothing is collected or sent while live updates are off', function () {
    config(['live.enabled' => false]);
    $live = app(LiveUpdates::class);

    $live->issue(1, 2);
    $live->access(3);
    $live->flush();

    expect($live->hasPending())->toBeFalse();
    Event::assertNothingDispatched();
});

test('changes in one project are sent as a single de-duplicated event', function () {
    $live = app(LiveUpdates::class);

    $live->issue(1, 5);
    $live->issue(1, 5);
    $live->issue(1, 6, 'created');
    $live->comment(1, 5, 'created');
    $live->issue(2, 9);
    $live->flush();

    Event::assertDispatchedTimes(ProjectChanged::class, 2);
    Event::assertDispatched(ProjectChanged::class, fn (ProjectChanged $event) => $event->projectId === 1
        && count($event->changes) === 3
        && $event->changes[0] === ['type' => 'issue', 'id' => 5, 'action' => 'updated']);
    expect($live->hasPending())->toBeFalse();
});

test('a flood of changes collapses into one bulk hint per kind', function () {
    $live = app(LiveUpdates::class);

    foreach (range(1, 40) as $id) {
        $live->issue(1, $id);
    }
    $live->project(1, 'members');
    $live->flush();

    Event::assertDispatched(ProjectChanged::class, fn (ProjectChanged $event) => $event->changes === [
        ['type' => 'issue', 'id' => null, 'action' => 'bulk'],
        ['type' => 'members', 'id' => null, 'action' => 'bulk'],
    ]);
});

test('an event carries ids only and goes to the project channel', function () {
    $event = new ProjectChanged(7, [['type' => 'issue', 'id' => 5, 'action' => 'updated']], 3);

    expect($event->broadcastOn()->name)->toBe('private-project.7')
        ->and($event->broadcastAs())->toBe('project.changed')
        ->and($event->broadcastQueue())->toBe('live')
        ->and($event->broadcastWith())->toBe([
            'changes' => [['type' => 'issue', 'id' => 5, 'action' => 'updated']],
            'actor' => 3,
        ]);
});

test('saving and deleting an issue is announced to its project', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    app(LiveUpdates::class)->flush();
    Event::fake([ProjectChanged::class]);

    $issue->update(['title' => 'Renamed']);
    app(LiveUpdates::class)->flush();

    Event::assertDispatched(ProjectChanged::class, fn (ProjectChanged $event) => $event->projectId === $project->id
        && in_array(['type' => 'issue', 'id' => $issue->id, 'action' => 'updated'], $event->changes, true));

    $issue->delete();
    app(LiveUpdates::class)->flush();

    Event::assertDispatched(ProjectChanged::class, fn (ProjectChanged $event) => in_array(
        ['type' => 'issue', 'id' => $issue->id, 'action' => 'deleted'],
        $event->changes,
        true,
    ));
});

test('a comment tells clients to refresh its issue', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    app(LiveUpdates::class)->flush();
    Event::fake([ProjectChanged::class]);

    Comment::factory()->create(['issue_id' => $issue->id, 'user_id' => User::factory()->create()->id]);
    app(LiveUpdates::class)->flush();

    Event::assertDispatched(ProjectChanged::class, fn (ProjectChanged $event) => in_array(
        ['type' => 'comment', 'id' => $issue->id, 'action' => 'created'],
        $event->changes,
        true,
    ));
});

test('bulk deleting issues announces each deleted issue, once per project', function () {
    $project = Project::factory()->create();
    $ids = Issue::factory()->count(3)->create(['project_id' => $project->id])->pluck('id')->all();
    app(LiveUpdates::class)->flush();
    Event::fake([ProjectChanged::class]);

    app(IssueRepository::class)->bulkDelete($ids);
    app(LiveUpdates::class)->flush();

    Event::assertDispatchedTimes(ProjectChanged::class, 1);
    Event::assertDispatched(ProjectChanged::class, fn (ProjectChanged $event) => collect($event->changes)
        ->where('action', 'deleted')->pluck('id')->sort()->values()->all() === collect($ids)->sort()->values()->all());
});

test('a large flush keeps the ids of deleted issues and collapses everything else', function () {
    $live = app(LiveUpdates::class);

    foreach (range(1, 30) as $id) {
        $live->issue(1, $id, 'deleted');
    }
    foreach (range(100, 140) as $id) {
        $live->issue(1, $id);
    }
    $live->flush();

    Event::assertDispatched(ProjectChanged::class, function (ProjectChanged $event) {
        $deleted = array_filter($event->changes, fn ($change) => $change['action'] === 'deleted');

        return count($deleted) === 30
            && in_array(['type' => 'issue', 'id' => null, 'action' => 'bulk'], $event->changes, true)
            && count($event->changes) === 31;
    });
});

test('past the cap deleted issues collapse too, so a message never outgrows the socket limit', function () {
    $live = app(LiveUpdates::class);

    foreach (range(1, 201) as $id) {
        $live->issue(1, $id, 'deleted');
    }
    $live->flush();

    Event::assertDispatched(ProjectChanged::class, fn (ProjectChanged $event) => $event->changes === [
        ['type' => 'issue', 'id' => null, 'action' => 'bulk'],
    ]);
});

test('editing only an issue\'s labels is announced', function () {
    $project = Project::factory()->create();
    Label::factory()->create(['project_id' => $project->id, 'name' => 'bug']);
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    app(LiveUpdates::class)->flush();
    Event::fake([ProjectChanged::class]);

    $issue->labels = ['bug'];
    $issue->save();
    app(LiveUpdates::class)->flush();

    Event::assertDispatched(ProjectChanged::class, fn (ProjectChanged $event) => in_array(
        ['type' => 'issue', 'id' => $issue->id, 'action' => 'updated'],
        $event->changes,
        true,
    ));
});

test('a new sub-issue also announces its parent', function () {
    $project = Project::factory()->create();
    $parent = Issue::factory()->create(['project_id' => $project->id]);
    app(LiveUpdates::class)->flush();
    Event::fake([ProjectChanged::class]);

    $child = Issue::factory()->create(['project_id' => $project->id, 'parent_id' => $parent->id]);
    app(LiveUpdates::class)->flush();

    Event::assertDispatched(ProjectChanged::class, fn (ProjectChanged $event) => in_array(
        ['type' => 'issue', 'id' => $parent->id, 'action' => 'updated'],
        $event->changes,
        true,
    ) && in_array(['type' => 'issue', 'id' => $child->id, 'action' => 'created'], $event->changes, true));
});

test('moving a sub-issue announces both its old and new parent', function () {
    $project = Project::factory()->create();
    [$old, $new] = Issue::factory()->count(2)->create(['project_id' => $project->id]);
    $child = Issue::factory()->create(['project_id' => $project->id, 'parent_id' => $old->id]);
    app(LiveUpdates::class)->flush();
    Event::fake([ProjectChanged::class]);

    $child->update(['parent_id' => $new->id]);
    app(LiveUpdates::class)->flush();

    Event::assertDispatched(ProjectChanged::class, function (ProjectChanged $event) use ($old, $new) {
        foreach ([$old, $new] as $parent) {
            if (! in_array(['type' => 'issue', 'id' => $parent->id, 'action' => 'updated'], $event->changes, true)) {
                return false;
            }
        }

        return true;
    });
});

test('editing a workflow status or transition announces its issue type', function () {
    $project = Project::factory()->create();
    $type = IssueType::factory()->create(['project_id' => $project->id]);
    $status = WorkflowStatus::factory()->create(['issue_type_id' => $type->id]);
    $other = WorkflowStatus::factory()->create(['issue_type_id' => $type->id]);
    app(LiveUpdates::class)->flush();
    Event::fake([ProjectChanged::class]);

    $status->update(['name' => 'Renamed']);
    WorkflowTransition::query()->create(['issue_type_id' => $type->id, 'from_status_id' => $status->id, 'to_status_id' => $other->id]);
    app(LiveUpdates::class)->flush();

    Event::assertDispatched(ProjectChanged::class, fn (ProjectChanged $event) => $event->projectId === $project->id
        && in_array(['type' => 'issue-types', 'id' => $type->id, 'action' => 'updated'], $event->changes, true));
});

test('creating or renaming a role is announced to its project', function () {
    $project = Project::factory()->create();
    $roles = app(RoleRepository::class);
    Event::fake([ProjectChanged::class]);

    $role = $roles->create($project, ['name' => 'Tester', 'slug' => 'tester', 'role' => 'custom']);
    app(LiveUpdates::class)->flush();
    $roles->update($role, ['name' => 'QA']);
    app(LiveUpdates::class)->flush();

    Event::assertDispatched(ProjectChanged::class, fn (ProjectChanged $event) => in_array(
        ['type' => 'roles', 'id' => $role->id, 'action' => 'created'],
        $event->changes,
        true,
    ));
    Event::assertDispatched(ProjectChanged::class, fn (ProjectChanged $event) => in_array(
        ['type' => 'roles', 'id' => $role->id, 'action' => 'updated'],
        $event->changes,
        true,
    ));
});

test('removing a member tells the project and that member', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    addProjectMember($project, $member->id, 'member');
    app(LiveUpdates::class)->flush();
    Event::fake([ProjectChanged::class, AccessChanged::class]);

    app(ProjectMemberRepository::class)->removeMember($project, $member->id);
    app(LiveUpdates::class)->flush();

    Event::assertDispatched(ProjectChanged::class, fn (ProjectChanged $event) => $event->changes[0]['type'] === 'members');
    Event::assertDispatched(AccessChanged::class, fn (AccessChanged $event) => $event->userId === $member->id
        && $event->projectId === $project->id
        && $event->broadcastOn()->name === "private-user.$member->id");
});

test('a new notification is announced once, with its content, to its owner only', function () {
    $user = User::factory()->create();

    $notification = app(NotificationService::class)->store([
        'user_id' => $user->id,
        'type' => 'info',
        'title' => 'Assigned',
        'message' => 'You were assigned',
        'read' => false,
        'action_url' => '/issues/1',
    ]);

    Event::assertDispatchedTimes(NotificationsChanged::class, 1);
    Event::assertDispatched(NotificationsChanged::class, fn (NotificationsChanged $event) => $event->userId === $user->id
        && $event->created?->is($notification)
        && $event->broadcastOn()->name === "private-user.$user->id");
});

test('the notification payload has the real unread count and no foreign data', function () {
    $user = User::factory()->create();
    $service = app(NotificationService::class);
    $notification = $service->store(['user_id' => $user->id, 'type' => 'info', 'title' => 'T', 'message' => 'M', 'read' => false, 'action_url' => null]);

    $payload = (new NotificationsChanged($user->id, $notification))->broadcastWith();

    expect($payload)->toBe([
        'unread' => 1,
        'created' => ['id' => $notification->id, 'type' => 'info', 'title' => 'T', 'message' => 'M', 'action_url' => null],
    ]);
});

test('reading or deleting notifications tells the user\'s other tabs without a payload notification', function () {
    $user = User::factory()->create();
    $service = app(NotificationService::class);
    $notification = $service->store(['user_id' => $user->id, 'type' => 'info', 'title' => 'T', 'message' => 'M', 'read' => false, 'action_url' => null]);
    Event::fake([NotificationsChanged::class]);

    $service->markAllAsReadForUser($user->id);
    $service->deleteForUser($user->id, [$notification->id]);

    Event::assertDispatchedTimes(NotificationsChanged::class, 2);
    Event::assertDispatched(NotificationsChanged::class, fn (NotificationsChanged $event) => $event->created === null);
});

test('no notification event is queued while live updates are off', function () {
    config(['live.enabled' => false]);
    $user = User::factory()->create();

    Notification::factory()->create(['user_id' => $user->id]);
    app(NotificationService::class)->markAllAsReadForUser($user->id);

    Event::assertNotDispatched(NotificationsChanged::class);
});

test('a request that changes an issue sends its event once the response is done', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();
    addProjectMember($project, $user->id, 'member');
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    app(LiveUpdates::class)->flush();
    Event::fake([ProjectChanged::class]);

    $this->actingAs($user)->patch(route('issues.update', $issue->id), ['title' => 'Changed by request'])->assertRedirect();

    Event::assertDispatched(ProjectChanged::class, fn (ProjectChanged $event) => $event->projectId === $project->id
        && $event->actorId === $user->id);
});
