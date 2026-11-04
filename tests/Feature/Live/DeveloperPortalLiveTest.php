<?php

use App\Broadcasting\LiveChannels;
use App\Events\Live\AccessChanged;
use App\Events\Live\DeveloperPortalChanged;
use App\Events\Live\ProjectChanged;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use App\Support\Live\LiveUpdates;
use Illuminate\Broadcasting\BroadcastManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;

uses(RefreshDatabase::class);

beforeEach(function () {
    config([
        'live.enabled' => true,
        'developer-portal.enabled' => true,
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-key',
        'broadcasting.connections.reverb.secret' => 'test-secret',
        'broadcasting.connections.reverb.app_id' => 'test-id',
        'broadcasting.connections.reverb.options.host' => 'reverb',
    ]);
    app(BroadcastManager::class)->forgetDrivers();
    require base_path('routes/channels.php');
    Event::fake([DeveloperPortalChanged::class, ProjectChanged::class, AccessChanged::class]);
});

function authorizePortalChannel(?User $user)
{
    $request = test();

    if ($user) {
        $request = $request->actingAs($user);
    }

    return $request->postJson('/broadcasting/auth', [
        'socket_id' => '1234.5678',
        'channel_name' => 'private-developer-portal',
    ]);
}

test('the channel is named developer-portal', function () {
    expect(LiveChannels::DEVELOPER_PORTAL)->toBe('developer-portal');
});

test('only users who may open the portal can join its channel', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $member = User::factory()->create();
    addProjectMember($project, $owner->id, 'owner');
    addProjectMember($project, $member->id, 'member');

    authorizePortalChannel(null)->assertUnauthorized();
    authorizePortalChannel($member)->assertForbidden();
    authorizePortalChannel($owner)->assertOk();

    config(['developer-portal.enabled' => false]);
    authorizePortalChannel($owner)->assertForbidden();
});

test('changes are collected into one event with their kinds, ids never rows', function () {
    $live = app(LiveUpdates::class);

    $live->portal('users');
    $live->portal('users');
    $live->portal('errors');
    $live->flush();

    Event::assertDispatchedTimes(DeveloperPortalChanged::class, 1);
    Event::assertDispatched(DeveloperPortalChanged::class, fn ($event) => $event->kinds === ['users', 'errors']
        && $event->broadcastWith() === ['kinds' => ['users', 'errors']]
        && $event->broadcastAs() === 'developer-portal.changed'
        && $event->broadcastQueue() === LiveChannels::QUEUE);
    expect($live->hasPending())->toBeFalse();
});

test('nothing is sent while the portal is off or live updates are off', function () {
    $live = app(LiveUpdates::class);

    config(['developer-portal.enabled' => false]);
    $live->portal('users');
    config(['developer-portal.enabled' => true, 'live.enabled' => false]);
    $live->portal('users');

    expect($live->hasPending())->toBeFalse();
});

test('issue, comment, project and member changes tell the portal', function () {
    $live = app(LiveUpdates::class);

    $live->issue(1, 2);
    $live->comment(1, 2);
    $live->project(1, 'project');
    $live->project(1, 'members');
    $live->project(1, 'labels');
    $live->flush();

    Event::assertDispatched(DeveloperPortalChanged::class, fn ($event) => $event->kinds === ['issues', 'projects']);
});

test('creating a user, a project or an issue reaches the portal', function () {
    User::factory()->create();
    Event::assertNotDispatched(DeveloperPortalChanged::class);
    app(LiveUpdates::class)->flush();
    Event::assertDispatched(DeveloperPortalChanged::class, fn ($event) => in_array('users', $event->kinds, true));

    $project = Project::factory()->create();
    Issue::factory()->for($project)->todo()->create(['user_id' => User::factory()->create()->id]);
    app(LiveUpdates::class)->flush();
    Event::assertDispatched(DeveloperPortalChanged::class, fn ($event) => $event->kinds === ['projects', 'issues'] || in_array('issues', $event->kinds, true));
});

test('a logged error tells the portal, a warning does not', function () {
    $live = app(LiveUpdates::class);

    Log::warning('just a warning');
    expect($live->hasPending())->toBeFalse();

    Log::error('something broke');
    expect($live->hasPending())->toBeTrue();
    $live->flush();
    Event::assertDispatched(DeveloperPortalChanged::class, fn ($event) => in_array('errors', $event->kinds, true));
});
