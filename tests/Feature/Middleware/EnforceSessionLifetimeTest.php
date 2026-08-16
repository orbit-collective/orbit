<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
});

test('a user active within their session lifetime stays authenticated', function () {
    $user = User::factory()->create(['session_lifetime' => 480]);

    $response = $this->withSession(['last_activity_at' => now()->subMinutes(60)])
        ->actingAs($user)
        ->get('/settings');

    $response->assertOk();
    $this->assertAuthenticatedAs($user);
});

test('a user idle beyond their session lifetime is signed out', function () {
    $user = User::factory()->create(['session_lifetime' => 60]);

    $response = $this->withSession(['last_activity_at' => now()->subMinutes(90)])
        ->actingAs($user)
        ->get('/settings');

    $response->assertRedirect(route('login'));
    $response->assertSessionHas('warning', 'You have been signed out due to inactivity.');
    $this->assertGuest();
});

test('a user idle for exactly their session lifetime is not yet signed out', function () {
    $user = User::factory()->create(['session_lifetime' => 60]);

    $response = $this->withSession(['last_activity_at' => now()->subMinutes(30)])
        ->actingAs($user)
        ->get('/settings');

    $response->assertOk();
    $this->assertAuthenticatedAs($user);
});

test('the first authenticated request after login does not trigger a logout', function () {
    $user = User::factory()->create(['session_lifetime' => 60]);

    $response = $this->actingAs($user)->get('/settings');

    $response->assertOk();
    $this->assertAuthenticatedAs($user);
});

test('a successful request refreshes the idle activity timestamp', function () {
    $user = User::factory()->create(['session_lifetime' => 60]);

    $this->withSession(['last_activity_at' => now()->subMinutes(45)])
        ->actingAs($user)
        ->get('/settings');

    expect(session('last_activity_at'))
        ->not->toBeNull()
        ->and(\Illuminate\Support\Carbon::parse(session('last_activity_at'))->diffInSeconds(now()))
        ->toBeLessThan(5);
});

test('guests are unaffected by the session lifetime check', function () {
    $response = $this->get('/settings');

    $response->assertRedirect(route('login'));
});
