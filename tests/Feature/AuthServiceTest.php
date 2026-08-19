<?php

use App\Models\User;
use App\Repositories\UserRepository;
use App\Services\AuthService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->userRepository = Mockery::mock(UserRepository::class);
    $this->service = new AuthService($this->userRepository);
});

test('it creates the user via the repository', function () {
    Event::fake();

    $data = ['name' => 'First User', 'email' => 'first@example.com', 'password' => 'password123'];
    $user = User::factory()->make(array_merge($data, ['id' => 1]));

    $this->userRepository->shouldReceive('create')
        ->once()
        ->with($data)
        ->andReturn($user);

    $result = $this->service->register($data);

    expect($result)->toBe($user);
});

test('it fires the Registered event on register', function () {
    Event::fake();

    $data = ['name' => 'Third User', 'email' => 'third@example.com', 'password' => 'password123'];
    $user = User::factory()->make(array_merge($data, ['id' => 3]));

    $this->userRepository->shouldReceive('create')->once()->andReturn($user);

    $this->service->register($data);

    Event::assertDispatched(Registered::class, fn ($event) => $event->user === $user);
});

test('it logs the user in on register', function () {
    Event::fake();

    $data = ['name' => 'Fourth User', 'email' => 'fourth@example.com', 'password' => 'password123'];
    $user = User::factory()->make(array_merge($data, ['id' => 4]));

    $this->userRepository->shouldReceive('create')->once()->andReturn($user);

    $this->service->register($data);

    $this->assertAuthenticatedAs($user);
});

test('attempt returns true and logs in for valid credentials', function () {
    $user = User::factory()->create(['email' => 'valid@example.com', 'password' => 'secret123']);

    $result = $this->service->attempt(['email' => 'valid@example.com', 'password' => 'secret123']);

    expect($result)->toBeTrue();
    $this->assertAuthenticatedAs($user);
});

test('attempt returns false and does not log in for invalid credentials', function () {
    User::factory()->create(['email' => 'valid2@example.com', 'password' => 'secret123']);

    $result = $this->service->attempt(['email' => 'valid2@example.com', 'password' => 'wrong-password']);

    expect($result)->toBeFalse();
    $this->assertGuest();
});
