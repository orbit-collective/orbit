<?php

use App\Broadcasting\LiveChannels;
use App\Events\Live\AccessChanged;
use App\Events\Live\DeveloperPortalChanged;
use App\Events\Live\ProjectChanged;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use App\Services\DeveloperPortal\ErrorLogService;
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

test('a logged error tells the portal, an info line does not', function () {
    $live = app(LiveUpdates::class);

    Log::info('just info');
    expect($live->hasPending())->toBeFalse();

    Log::error('something broke');
    expect($live->hasPending())->toBeTrue();
    $live->flush();
    Event::assertDispatched(DeveloperPortalChanged::class, fn ($event) => in_array('errors', $event->kinds, true));
});

test('announcing an error drops the cached log read so the reload sees it', function () {
    $dir = sys_get_temp_dir().'/orbit-live-log-'.uniqid();
    mkdir($dir);
    config(['developer-portal.errors.directory' => $dir]);
    $today = now()->format('Y-m-d');
    file_put_contents($dir.'/laravel.log', "[$today 10:00:00] local.ERROR: first\n");

    $service = app(ErrorLogService::class);
    expect($service->recent()['entries'])->toHaveCount(1);

    // A second error lands within the cache window.
    file_put_contents($dir.'/laravel.log', "[$today 10:00:01] local.ERROR: second\n", FILE_APPEND);
    expect($service->recent()['entries'])->toHaveCount(1);

    $live = app(LiveUpdates::class);
    $live->portal('errors');
    $live->flush();

    expect($service->recent()['entries'])->toHaveCount(2);

    array_map('unlink', glob($dir.'/*'));
    rmdir($dir);
});

test('announcing something other than errors leaves the cached log read alone', function () {
    $dir = sys_get_temp_dir().'/orbit-live-log-'.uniqid();
    mkdir($dir);
    config(['developer-portal.errors.directory' => $dir]);
    $today = now()->format('Y-m-d');
    file_put_contents($dir.'/laravel.log', "[$today 10:00:00] local.ERROR: first\n");
    $service = app(ErrorLogService::class);
    $service->recent();
    file_put_contents($dir.'/laravel.log', "[$today 10:00:01] local.ERROR: second\n", FILE_APPEND);

    $live = app(LiveUpdates::class);
    $live->portal('users');
    $live->flush();

    expect($service->recent()['entries'])->toHaveCount(1);

    array_map('unlink', glob($dir.'/*'));
    rmdir($dir);
});

test('a workflow status changing tells the portal its issue buckets moved', function () {
    $live = app(LiveUpdates::class);

    $live->project(1, 'issue-types', 7);
    $live->flush();

    Event::assertDispatched(DeveloperPortalChanged::class, fn ($event) => $event->kinds === ['issues']);
});

test('editing a displayed user field tells the portal, other edits do not', function () {
    $user = User::factory()->create();
    app(LiveUpdates::class)->flush();
    Event::fake([DeveloperPortalChanged::class, ProjectChanged::class, AccessChanged::class]);

    $user->update(['session_lifetime' => 120]);
    expect(app(LiveUpdates::class)->hasPending())->toBeFalse();

    $user->update(['name' => 'Renamed Person']);
    expect(app(LiveUpdates::class)->hasPending())->toBeTrue();
    app(LiveUpdates::class)->flush();
    Event::assertDispatched(DeveloperPortalChanged::class, fn ($event) => $event->kinds === ['users']);

    $user->update(['email' => 'new@example.test']);
    expect(app(LiveUpdates::class)->hasPending())->toBeTrue();
    app(LiveUpdates::class)->flush();

    $user->update(['avatar' => 'https://example.test/a.png']);
    expect(app(LiveUpdates::class)->hasPending())->toBeTrue();
});

test('a logged warning tells the portal too, since the daily chart counts warnings', function () {
    $live = app(LiveUpdates::class);

    Log::info('noise');
    expect($live->hasPending())->toBeFalse();

    Log::warning('slow thing');
    expect($live->hasPending())->toBeTrue();
    $live->flush();
    Event::assertDispatched(DeveloperPortalChanged::class, fn ($event) => in_array('errors', $event->kinds, true));
});
