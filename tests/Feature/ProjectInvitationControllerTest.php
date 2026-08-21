<?php

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\User;
use App\Services\ProjectInvitationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['mail.default' => 'smtp']);
    Notification::fake();
});

test('an admin can invite someone by email', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $response = $this->actingAs($admin)->post("/projects/{$project->id}/invitations", [
        'email' => 'invitee@example.com',
        'role' => 'member',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('project_invitations', ['email' => 'invitee@example.com']);
});

test('a member cannot invite anyone', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($member)->post("/projects/{$project->id}/invitations", [
        'email' => 'invitee@example.com',
        'role' => 'member',
    ]);

    $response->assertForbidden();
});

test('invitations are blocked when email is not configured', function () {
    config(['mail.default' => 'log']);

    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $response = $this->actingAs($admin)->post("/projects/{$project->id}/invitations", [
        'email' => 'invitee@example.com',
        'role' => 'member',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertDatabaseMissing('project_invitations', ['email' => 'invitee@example.com']);
});

test('an admin can revoke a pending invitation', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $invitation = app(ProjectInvitationService::class)->invite($project, 'invitee@example.com', RoleType::MEMBER, $admin);

    $response = $this->actingAs($admin)->delete("/projects/{$project->id}/invitations/{$invitation->id}");

    $response->assertRedirect();
    $this->assertDatabaseMissing('project_invitations', ['id' => $invitation->id]);
});

test('revoking an invitation via the wrong project returns a 404', function () {
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $admin = User::factory()->create();
    $project = User::factory()->create();
    $projectA->users()->attach($admin->id, ['role' => 'admin']);
    $projectB->users()->attach($project->id, ['role' => 'admin']);
    $invitation = app(ProjectInvitationService::class)->invite($projectB, 'invitee@example.com', RoleType::MEMBER, $project);

    $response = $this->actingAs($admin)->delete("/projects/{$projectA->id}/invitations/{$invitation->id}");

    $response->assertNotFound();
});

test('a member cannot revoke an invitation', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);
    $invitation = app(ProjectInvitationService::class)->invite($project, 'invitee@example.com', RoleType::MEMBER, $admin);

    $response = $this->actingAs($member)->delete("/projects/{$project->id}/invitations/{$invitation->id}");

    $response->assertForbidden();
});

test('clicking the invitation link while logged in with the matching email joins the project', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $invitee = User::factory()->create(['email' => 'invitee@example.com']);
    $invitation = app(ProjectInvitationService::class)->invite($project, 'invitee@example.com', RoleType::MEMBER, $admin);

    $response = $this->actingAs($invitee)->get("/invitations/{$invitation->token}");

    $response->assertRedirect(route('projects.show', $project->id));
    expect($project->users()->where('users.id', $invitee->id)->exists())->toBeTrue();
});

test('clicking the invitation link while logged out redirects to login and remembers the token', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $invitation = app(ProjectInvitationService::class)->invite($project, 'invitee@example.com', RoleType::MEMBER, $admin);

    $response = $this->get("/invitations/{$invitation->token}");

    $response->assertRedirect(route('login'));
    $this->assertEquals($invitation->token, session('pending_invitation_token'));
});

test('clicking an unknown invitation link redirects to login with an error, without remembering it', function () {
    $response = $this->get('/invitations/not-a-real-token');

    $response->assertRedirect(route('login'));
    $response->assertSessionHas('error', 'This invitation link is invalid or has expired.');
    $this->assertNull(session('pending_invitation_token'));
});

test('clicking an expired invitation link while logged in redirects to the dashboard with an error', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $invitee = User::factory()->create(['email' => 'invitee@example.com']);
    $invitation = app(ProjectInvitationService::class)->invite($project, 'invitee@example.com', RoleType::MEMBER, $admin);
    $invitation->update(['expires_at' => now()->subDay()]);

    $response = $this->actingAs($invitee)->get("/invitations/{$invitation->token}");

    $response->assertRedirect(route('dashboard'));
    $response->assertSessionHas('error', 'This invitation link is invalid or has expired.');
});

test('clicking the invitation link with a mismatched account email surfaces the specific error', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $wrongUser = User::factory()->create(['email' => 'someone-else@example.com']);
    $invitation = app(ProjectInvitationService::class)->invite($project, 'invitee@example.com', RoleType::MEMBER, $admin);

    $response = $this->actingAs($wrongUser)->get("/invitations/{$invitation->token}");

    $response->assertRedirect(route('dashboard'));
    $response->assertSessionHas('error', 'This invitation was sent to a different email address.');
});

test('logging in after clicking an invitation link accepts it automatically', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $invitee = User::factory()->create(['email' => 'invitee@example.com', 'password' => 'password123']);
    $invitation = app(ProjectInvitationService::class)->invite($project, 'invitee@example.com', RoleType::MEMBER, $admin);

    $this->get("/invitations/{$invitation->token}");

    $response = $this->post('/login', [
        'email' => 'invitee@example.com',
        'password' => 'password123',
    ]);

    $response->assertRedirect(route('projects.show', $project->id));
    expect($project->users()->where('users.id', $invitee->id)->exists())->toBeTrue();
});

test('logging in with a mismatched email after clicking an invitation link surfaces the specific error', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $wrongUser = User::factory()->create(['email' => 'someone-else@example.com', 'password' => 'password123']);
    $invitation = app(ProjectInvitationService::class)->invite($project, 'invitee@example.com', RoleType::MEMBER, $admin);

    $this->get("/invitations/{$invitation->token}");

    $response = $this->post('/login', [
        'email' => 'someone-else@example.com',
        'password' => 'password123',
    ]);

    $response->assertSessionHas('error', 'This invitation was sent to a different email address.');
    expect($project->users()->where('users.id', $wrongUser->id)->exists())->toBeFalse();
});

test('registering after clicking an invitation link accepts it automatically', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $invitation = app(ProjectInvitationService::class)->invite($project, 'new-person@example.com', RoleType::MEMBER, $admin);

    $this->get("/invitations/{$invitation->token}");

    $response = $this->post('/register', [
        'name' => 'New Person',
        'email' => 'new-person@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertRedirect(route('projects.show', $project->id));
    $newUser = User::where('email', 'new-person@example.com')->firstOrFail();
    expect($project->users()->where('users.id', $newUser->id)->exists())->toBeTrue();
});

test('a logged-in user can manually accept an invitation by pasting its token', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $invitee = User::factory()->create(['email' => 'invitee@example.com']);
    $invitation = app(ProjectInvitationService::class)->invite($project, 'invitee@example.com', RoleType::MEMBER, $admin);

    $response = $this->actingAs($invitee)->post('/invitations/accept', [
        'token' => $invitation->token,
    ]);

    $response->assertRedirect(route('projects.show', $project->id));
    expect($project->users()->where('users.id', $invitee->id)->exists())->toBeTrue();
});

test('manually accepting an invalid token fails with a validation error', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/invitations/accept', [
        'token' => 'not-a-real-token',
    ]);

    $response->assertSessionHasErrors('token');
});

test('guests cannot manually accept an invitation', function () {
    $response = $this->post('/invitations/accept', ['token' => 'whatever']);

    $response->assertRedirect(route('login'));
});
