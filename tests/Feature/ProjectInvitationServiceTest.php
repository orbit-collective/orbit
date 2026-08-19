<?php

use App\Enums\ProjectRole;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\User;
use App\Notifications\ProjectInvitationMail;
use App\Services\ProjectInvitationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['mail.default' => 'smtp']);
    $this->service = app(ProjectInvitationService::class);
});

test('it sends an invitation email and creates a pending invitation', function () {
    Notification::fake();

    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $invitation = $this->service->invite($project, 'invitee@example.com', ProjectRole::MEMBER, $admin);

    expect($invitation->email)->toBe('invitee@example.com');
    expect($invitation->isAccepted())->toBeFalse();
    $this->assertDatabaseHas('project_invitations', [
        'project_id' => $project->id,
        'email' => 'invitee@example.com',
    ]);

    Notification::assertSentOnDemand(ProjectInvitationMail::class);
});

test('it refuses to invite when email is not configured', function () {
    config(['mail.default' => 'log']);
    Notification::fake();

    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $this->service->invite($project, 'invitee@example.com', ProjectRole::MEMBER, $admin);
})->throws(ValidationException::class);

test('it refuses to invite someone who is already a member', function () {
    Notification::fake();

    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $existingMember = User::factory()->create(['email' => 'already@example.com']);
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($existingMember->id, ['role' => 'member']);

    $this->service->invite($project, 'already@example.com', ProjectRole::MEMBER, $admin);
})->throws(ValidationException::class);

test('inviting the same email again replaces the previous pending invitation', function () {
    Notification::fake();

    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $first = $this->service->invite($project, 'invitee@example.com', ProjectRole::MEMBER, $admin);
    $second = $this->service->invite($project, 'invitee@example.com', ProjectRole::ADMIN, $admin);

    expect(ProjectInvitation::find($first->id))->toBeNull();
    expect(ProjectInvitation::find($second->id))->not->toBeNull();
});

test('a valid token can be accepted and attaches the user with the invited role', function () {
    Notification::fake();

    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $invitee = User::factory()->create(['email' => 'invitee@example.com']);

    $invitation = $this->service->invite($project, 'invitee@example.com', ProjectRole::ADMIN, $admin);

    $result = $this->service->acceptByToken($invitation->token, $invitee);

    expect($result->id)->toBe($project->id);
    expect($project->users()->where('users.id', $invitee->id)->first()->pivot->role)->toBe('admin');
    expect($invitation->fresh()->isAccepted())->toBeTrue();
});

test('accepting a token twice fails the second time', function () {
    Notification::fake();

    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $invitee = User::factory()->create(['email' => 'invitee@example.com']);

    $invitation = $this->service->invite($project, 'invitee@example.com', ProjectRole::MEMBER, $admin);
    $this->service->acceptByToken($invitation->token, $invitee);

    $this->service->acceptByToken($invitation->token, $invitee);
})->throws(ValidationException::class);

test('accepting with an email that does not match the invitation fails', function () {
    Notification::fake();

    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $wrongUser = User::factory()->create(['email' => 'someone-else@example.com']);

    $invitation = $this->service->invite($project, 'invitee@example.com', ProjectRole::MEMBER, $admin);

    $this->service->acceptByToken($invitation->token, $wrongUser);
})->throws(ValidationException::class);

test('an expired invitation cannot be accepted', function () {
    Notification::fake();

    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $invitee = User::factory()->create(['email' => 'invitee@example.com']);

    $invitation = $this->service->invite($project, 'invitee@example.com', ProjectRole::MEMBER, $admin);
    $invitation->update(['expires_at' => now()->subDay()]);

    $this->service->acceptByToken($invitation->token, $invitee);
})->throws(ValidationException::class);

test('an unknown token cannot be accepted', function () {
    $invitee = User::factory()->create();

    $this->service->acceptByToken('not-a-real-token', $invitee);
})->throws(ValidationException::class);

test('revoking an invitation deletes it', function () {
    Notification::fake();

    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $invitation = $this->service->invite($project, 'invitee@example.com', ProjectRole::MEMBER, $admin);

    $this->service->revoke($invitation);

    expect(ProjectInvitation::find($invitation->id))->toBeNull();
});

test('it lists only pending, unexpired invitations for a project', function () {
    Notification::fake();

    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $pending = $this->service->invite($project, 'pending@example.com', ProjectRole::MEMBER, $admin);
    $expired = $this->service->invite($project, 'expired@example.com', ProjectRole::MEMBER, $admin);
    $expired->update(['expires_at' => now()->subDay()]);

    $results = $this->service->getPending($project);

    expect($results->pluck('id')->all())->toBe([$pending->id]);
});
