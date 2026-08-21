<?php

use App\Enums\Permissions\RoleType;
use App\Models\NotificationSetting;
use App\Models\Project;
use App\Models\User;
use App\Services\ProjectInvitationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
});

test('authenticated user can view the settings page', function () {
    $response = $this->actingAs(User::factory()->create())->get('/settings');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Settings/Index')
    );
});

test('guest is redirected to login when visiting settings', function () {
    $response = $this->get('/settings');

    $response->assertRedirect(route('login'));
});

test('settings page includes the authenticated user sessions with the current one flagged', function () {
    $user = User::factory()->create();

    $currentSessionId = str_repeat('a', 40);
    DB::table('sessions')->insert([
        [
            'id' => $currentSessionId,
            'user_id' => $user->id,
            'ip_address' => '10.0.0.1',
            'user_agent' => 'Current Agent',
            'payload' => base64_encode(serialize([])),
            'last_activity' => now()->timestamp,
        ],
        [
            'id' => 'another-session-id',
            'user_id' => $user->id,
            'ip_address' => '10.0.0.5',
            'user_agent' => 'Other Agent',
            'payload' => base64_encode(serialize([])),
            'last_activity' => now()->timestamp,
        ],
    ]);

    $response = $this->withCookie(config('session.cookie'), $currentSessionId)
        ->actingAs($user)
        ->get('/settings');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Settings/Index')
        ->has('sessions', 2)
        ->where('sessions', fn ($sessions) => collect($sessions)
            ->firstWhere('id', $currentSessionId)['isCurrent'] === true
            && collect($sessions)->firstWhere('id', 'another-session-id')['isCurrent'] === false)
    );
});

test('settings page defaults in-app notifications to enabled and email notifications to disabled', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/settings');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Settings/Index')
        ->where('notificationSettings.issue_assigned.in_app', true)
        ->where('notificationSettings.issue_assigned.email', false)
        ->where('notificationSettings.project_invited.email', false)
    );
});

test('settings page has no selected project when the user belongs to none', function () {
    $response = $this->actingAs(User::factory()->create())->get('/settings');

    $response->assertInertia(fn (Assert $page) => $page
        ->where('memberProjects', [])
        ->where('selectedProjectId', null)
        ->where('viewerRole', null)
        ->where('members', [])
        ->where('pendingInvitations', [])
    );
});

test('settings page defaults to the user\'s first project and lists its members', function () {
    $user = User::factory()->create();
    $otherMember = User::factory()->create();
    $project = Project::factory()->create();
    $project->users()->attach($user->id, ['role' => 'admin']);
    $project->users()->attach($otherMember->id, ['role' => 'member']);

    $response = $this->actingAs($user)->get('/settings');

    $response->assertInertia(fn (Assert $page) => $page
        ->where('selectedProjectId', $project->id)
        ->where('viewerRole', 'admin')
        ->has('members', 2)
        ->where('memberProjects.0.id', $project->id)
    );
});

test('settings page respects the project query parameter', function () {
    $user = User::factory()->create();
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $projectA->users()->attach($user->id, ['role' => 'admin']);
    $projectB->users()->attach($user->id, ['role' => 'member']);

    $response = $this->actingAs($user)->get("/settings?project={$projectB->id}");

    $response->assertInertia(fn (Assert $page) => $page
        ->where('selectedProjectId', $projectB->id)
        ->where('viewerRole', 'member')
    );
});

test('settings page lists pending invitations for the selected project', function () {
    config(['mail.default' => 'smtp']);
    Notification::fake();

    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->users()->attach($user->id, ['role' => 'admin']);
    app(ProjectInvitationService::class)->invite($project, 'invitee@example.com', RoleType::MEMBER, $user);

    $response = $this->actingAs($user)->get('/settings');

    $response->assertInertia(fn (Assert $page) => $page
        ->has('pendingInvitations', 1)
        ->where('pendingInvitations.0.email', 'invitee@example.com')
    );
});

test('settings page reflects saved notification setting overrides', function () {
    $user = User::factory()->create();
    NotificationSetting::query()->create([
        'user_id' => $user->id,
        'type' => 'issue_assigned',
        'channel' => 'email',
        'enabled' => true,
    ]);
    NotificationSetting::query()->create([
        'user_id' => $user->id,
        'type' => 'issue_assigned',
        'channel' => 'in_app',
        'enabled' => false,
    ]);

    $response = $this->actingAs($user)->get('/settings');

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Settings/Index')
        ->where('notificationSettings.issue_assigned.email', true)
        ->where('notificationSettings.issue_assigned.in_app', false)
    );
});
