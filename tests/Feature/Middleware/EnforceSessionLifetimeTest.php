<?php

use App\Models\User;
use App\Support\Sessions\SessionRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
});

test('a user active within their session lifetime stays authenticated', function () {
    $user = User::factory()->create(['session_lifetime' => 480]);

    $response = $this->withSession(['last_activity_at' => now()->subMinutes(60)])
        ->actingAs($user)
        ->get('/settings/preferences');

    $response->assertOk();
    $this->assertAuthenticatedAs($user);
});

test('a user idle beyond their session lifetime is signed out', function () {
    $user = User::factory()->create(['session_lifetime' => 60]);

    $response = $this->withSession(['last_activity_at' => now()->subMinutes(90)])
        ->actingAs($user)
        ->get('/settings/preferences');

    $response->assertRedirect(route('login'));
    $response->assertSessionHas('warning', 'You have been signed out due to inactivity.');
    $this->assertGuest();
});

test('a user idle for exactly their session lifetime is not yet signed out', function () {
    $user = User::factory()->create(['session_lifetime' => 60]);

    $response = $this->withSession(['last_activity_at' => now()->subMinutes(30)])
        ->actingAs($user)
        ->get('/settings/preferences');

    $response->assertOk();
    $this->assertAuthenticatedAs($user);
});

test('the first authenticated request after login does not trigger a logout', function () {
    $user = User::factory()->create(['session_lifetime' => 60]);

    $response = $this->actingAs($user)->get('/settings/preferences');

    $response->assertOk();
    $this->assertAuthenticatedAs($user);
});

test('a successful request refreshes the idle activity timestamp', function () {
    $user = User::factory()->create(['session_lifetime' => 60]);

    $this->withSession(['last_activity_at' => now()->subMinutes(45)])
        ->actingAs($user)
        ->get('/settings/preferences');

    expect(session('last_activity_at'))
        ->not->toBeNull()
        ->and(Carbon::parse(session('last_activity_at'))->diffInSeconds(now()))
        ->toBeLessThan(5);
});

test('guests are unaffected by the session lifetime check', function () {
    $response = $this->get('/settings/preferences');

    $response->assertRedirect(route('login'));
});

test('the session is registered for the Security page when the session store needs a registry', function () {
    $user = User::factory()->create();
    $registry = Mockery::mock(SessionRegistry::class);
    $registry->shouldReceive('enabled')->andReturnTrue();
    $registry->shouldReceive('touch')->once()->with($user->id, Mockery::type('string'), Mockery::any(), Mockery::any());
    $this->app->instance(SessionRegistry::class, $registry);

    $this->actingAs($user)->get('/settings/preferences');
});

test('a session registered under another id is registered again', function () {
    $user = User::factory()->create();
    $registry = Mockery::mock(SessionRegistry::class);
    $registry->shouldReceive('enabled')->andReturnTrue();
    $registry->shouldReceive('touch')->once();
    $this->app->instance(SessionRegistry::class, $registry);

    $this->withSession(['session_registry' => ['id' => 'an-older-id', 'at' => now()->getTimestamp()]])
        ->actingAs($user)
        ->get('/settings/preferences');
});

test('nothing is registered when the session store lists its own sessions', function () {
    $registry = Mockery::mock(SessionRegistry::class);
    $registry->shouldReceive('enabled')->andReturnFalse();
    $registry->shouldNotReceive('touch');
    $this->app->instance(SessionRegistry::class, $registry);

    $this->actingAs(User::factory()->create())->get('/settings/preferences');
});
