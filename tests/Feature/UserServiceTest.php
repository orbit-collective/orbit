<?php

use App\Models\User;
use App\Repositories\UserRepository;
use App\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->userRepository = Mockery::mock(UserRepository::class);
    $this->service = new UserService($this->userRepository);
});

test('it delegates fetching assignable users to the repository', function () {
    $users = User::factory()->count(2)->make();

    $this->userRepository->shouldReceive('getAssignableUsers')
        ->once()
        ->andReturn($users);

    $result = $this->service->getAssignableUsers();

    expect($result)->toBe($users);
});

test('it can update profile without avatar', function () {
    $user = User::factory()->create();
    $data = ['name' => 'New Name'];

    $this->userRepository->shouldReceive('update')
        ->once()
        ->with($user, $data)
        ->andReturn($user);

    $result = $this->service->updateProfile($user, $data);

    expect($result)->toBe($user);
});

test('it can update profile with avatar', function () {
    Storage::fake('public');
    $user = User::factory()->create(['avatar' => null]);
    $file = UploadedFile::fake()->create('avatar.jpg', 100);
    $data = ['name' => 'New Name'];

    $this->userRepository->shouldReceive('update')
        ->once()
        ->with($user, Mockery::on(function ($arg) {
            return $arg['name'] === 'New Name' && str_contains($arg['avatar'], 'avatars/');
        }))
        ->andReturn($user);

    $result = $this->service->updateProfile($user, $data, $file);

    expect($result)->toBe($user);
    Storage::disk('public')->assertExists('avatars/' . $file->hashName());
});

test('it deletes old avatar when uploading new one', function () {
    Storage::fake('public');
    $oldAvatarPath = 'avatars/old.jpg';
    Storage::disk('public')->put($oldAvatarPath, 'content');

    $user = User::factory()->create(['avatar' => '/storage/' . $oldAvatarPath]);
    $file = UploadedFile::fake()->create('new.jpg', 100);
    $data = ['name' => 'New Name'];

    $this->userRepository->shouldReceive('update')
        ->once()
        ->andReturn($user);

    $this->service->updateProfile($user, $data, $file);

    Storage::disk('public')->assertMissing($oldAvatarPath);
    Storage::disk('public')->assertExists('avatars/' . $file->hashName());
});

test('it delegates completing onboarding to the repository', function () {
    $user = User::factory()->create(['has_completed_onboarding' => false]);

    $this->userRepository->shouldReceive('completeOnboarding')
        ->once()
        ->with($user)
        ->andReturn($user);

    $result = $this->service->completeOnboarding($user);

    expect($result)->toBe($user);
});

test('it delegates completing project onboarding to the repository', function () {
    $user = User::factory()->create(['has_completed_project_onboarding' => false]);

    $this->userRepository->shouldReceive('completeProjectOnboarding')
        ->once()
        ->with($user)
        ->andReturn($user);

    $result = $this->service->completeProjectOnboarding($user);

    expect($result)->toBe($user);
});

test('it updates the password when the current password is correct', function () {
    $user = User::factory()->create(['password' => 'current-password']);

    $this->userRepository->shouldReceive('updatePassword')
        ->once()
        ->with($user, 'new-password')
        ->andReturn($user);

    $result = $this->service->updatePassword($user, 'current-password', 'new-password');

    expect($result)->toBe($user);
});

test('it throws a validation exception when the current password is incorrect', function () {
    $user = User::factory()->create(['password' => 'current-password']);

    $this->userRepository->shouldReceive('updatePassword')->never();

    $this->service->updatePassword($user, 'wrong-password', 'new-password');
})->throws(ValidationException::class);
