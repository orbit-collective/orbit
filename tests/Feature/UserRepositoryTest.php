<?php

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
