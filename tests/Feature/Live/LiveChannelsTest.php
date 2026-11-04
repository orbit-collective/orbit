<?php

use App\Broadcasting\LiveChannels;
use App\Models\Project;
use App\Models\User;
use App\Support\Cache\CacheVersion;
use Illuminate\Broadcasting\BroadcastManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-key',
        'broadcasting.connections.reverb.secret' => 'test-secret',
        'broadcasting.connections.reverb.app_id' => 'test-id',
        'broadcasting.connections.reverb.options.host' => 'reverb',
    ]);
    // Channel authorisations live on the driver instance: rebuild it and
    // register them again, as the application does on boot.
    app(BroadcastManager::class)->forgetDrivers();
    require base_path('routes/channels.php');
});

function authorizeChannel(string $channel, ?User $user = null)
{
    $request = test();

    if ($user) {
        $request = $request->actingAs($user);
    }

    return $request->postJson('/broadcasting/auth', [
        'socket_id' => '1234.5678',
        'channel_name' => "private-$channel",
    ]);
}

test('channel names are one per user and one per project', function () {
    expect(LiveChannels::user(7))->toBe('user.7')
        ->and(LiveChannels::project(3))->toBe('project.3');
});

test('guests cannot authorise any channel', function () {
    authorizeChannel('user.1')->assertUnauthorized();
});

test('a user may join only their own channel', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    authorizeChannel(LiveChannels::user($user->id), $user)->assertOk()->assertJsonStructure(['auth']);
    authorizeChannel(LiveChannels::user($other->id), $user)->assertForbidden();
});

test('a project channel is open to members who can view the project', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $viewer = User::factory()->create();
    addProjectMember($project, $member->id, 'member');
    addProjectMember($project, $viewer->id, 'viewer');

    authorizeChannel(LiveChannels::project($project->id), $member)->assertOk();
    authorizeChannel(LiveChannels::project($project->id), $viewer)->assertOk();
});

test('a project channel is closed to non-members and to a removed member', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $stranger = User::factory()->create();
    addProjectMember($project, $member->id, 'member');

    authorizeChannel(LiveChannels::project($project->id), $stranger)->assertForbidden();

    $project->users()->detach($member->id);
    CacheVersion::bump(CacheVersion::MEMBERSHIP);

    authorizeChannel(LiveChannels::project($project->id), $member)->assertForbidden();
});

test('a project that does not exist is never joinable', function () {
    $user = User::factory()->create();

    expect(LiveChannels::canJoinProject($user, 999_999))->toBeFalse();
    authorizeChannel(LiveChannels::project(999_999), $user)->assertForbidden();
});
