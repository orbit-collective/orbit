<?php

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = new UserRepository();
});

test('it can get assignable users', function () {
    User::factory()->count(5)->create();

    $users = $this->repository->getAssignableUsers();

    expect($users)->toHaveCount(5)
        ->and($users->first())->toHaveKeys(['id', 'name', 'avatar']);
});

test('it can update a user', function () {
    $user = User::factory()->create(['name' => 'Old Name']);

    $updatedUser = $this->repository->update($user, ['name' => 'New Name']);

    expect($updatedUser->name)->toBe('New Name');
    $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'New Name']);
});

test('it can create a user', function () {
    $user = $this->repository->create([
        'name' => 'New User',
        'email' => 'new@example.com',
        'password' => 'password123',
    ]);

    expect($user)->toBeInstanceOf(User::class);
    $this->assertDatabaseHas('users', ['id' => $user->id, 'email' => 'new@example.com']);
});

test('it reports no users exist when the table is empty', function () {
    expect($this->repository->hasAnyUsers())->toBeFalse();
});

test('it reports users exist once at least one has been created', function () {
    User::factory()->create();

    expect($this->repository->hasAnyUsers())->toBeTrue();
});

test('it can mark onboarding as completed for a user', function () {
    $user = User::factory()->create(['has_completed_onboarding' => false]);

    $updatedUser = $this->repository->completeOnboarding($user);

    expect($updatedUser->has_completed_onboarding)->toBeTrue();
    $this->assertDatabaseHas('users', ['id' => $user->id, 'has_completed_onboarding' => true]);
});

test('it can mark project onboarding as completed for a user', function () {
    $user = User::factory()->create(['has_completed_project_onboarding' => false]);

    $updatedUser = $this->repository->completeProjectOnboarding($user);

    expect($updatedUser->has_completed_project_onboarding)->toBeTrue();
    $this->assertDatabaseHas('users', ['id' => $user->id, 'has_completed_project_onboarding' => true]);
});

test('it can update a user password', function () {
    $user = User::factory()->create(['password' => 'old-password']);

    $updatedUser = $this->repository->updatePassword($user, 'new-password');

    expect(Hash::check('new-password', $updatedUser->password))->toBeTrue();
});

test('it gets sessions belonging to a user ordered by most recent activity', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    DB::table('sessions')->insert([
        ['id' => 'session-older', 'user_id' => $user->id, 'ip_address' => '10.0.0.1', 'user_agent' => 'Agent A', 'payload' => '', 'last_activity' => 100],
        ['id' => 'session-newer', 'user_id' => $user->id, 'ip_address' => '10.0.0.2', 'user_agent' => 'Agent B', 'payload' => '', 'last_activity' => 200],
        ['id' => 'session-other-user', 'user_id' => $otherUser->id, 'ip_address' => '10.0.0.3', 'user_agent' => 'Agent C', 'payload' => '', 'last_activity' => 300],
    ]);

    $sessions = $this->repository->getUserSessions($user);

    expect($sessions)->toHaveCount(2)
        ->and($sessions->pluck('id')->all())->toBe(['session-newer', 'session-older']);
});

test('it deletes a session belonging to the given user', function () {
    $user = User::factory()->create();

    DB::table('sessions')->insert([
        'id' => 'session-a', 'user_id' => $user->id, 'ip_address' => '10.0.0.1', 'user_agent' => 'Agent A', 'payload' => '', 'last_activity' => 100,
    ]);

    $result = $this->repository->deleteSession($user, 'session-a');

    expect($result)->toBeTrue();
    $this->assertDatabaseMissing('sessions', ['id' => 'session-a']);
});

test('it does not delete a session belonging to another user', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    DB::table('sessions')->insert([
        'id' => 'session-a', 'user_id' => $otherUser->id, 'ip_address' => '10.0.0.1', 'user_agent' => 'Agent A', 'payload' => '', 'last_activity' => 100,
    ]);

    $result = $this->repository->deleteSession($user, 'session-a');

    expect($result)->toBeFalse();
    $this->assertDatabaseHas('sessions', ['id' => 'session-a']);
});

test('it deletes every session for a user except the current one', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    DB::table('sessions')->insert([
        ['id' => 'current-session', 'user_id' => $user->id, 'ip_address' => '10.0.0.1', 'user_agent' => 'Agent A', 'payload' => '', 'last_activity' => 100],
        ['id' => 'other-session', 'user_id' => $user->id, 'ip_address' => '10.0.0.2', 'user_agent' => 'Agent B', 'payload' => '', 'last_activity' => 200],
        ['id' => 'foreign-session', 'user_id' => $otherUser->id, 'ip_address' => '10.0.0.3', 'user_agent' => 'Agent C', 'payload' => '', 'last_activity' => 300],
    ]);

    $deletedCount = $this->repository->deleteOtherSessions($user, 'current-session');

    expect($deletedCount)->toBe(1);
    $this->assertDatabaseHas('sessions', ['id' => 'current-session']);
    $this->assertDatabaseMissing('sessions', ['id' => 'other-session']);
    $this->assertDatabaseHas('sessions', ['id' => 'foreign-session']);
});

test('it updates a user session lifetime', function () {
    $user = User::factory()->create(['session_lifetime' => 480]);

    $updatedUser = $this->repository->updateSessionLifetime($user, 1440);

    expect($updatedUser->session_lifetime)->toBe(1440);
    $this->assertDatabaseHas('users', ['id' => $user->id, 'session_lifetime' => 1440]);
});
