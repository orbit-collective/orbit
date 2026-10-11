<?php

use App\Models\User;
use App\Support\Sessions\SessionRegistry;

test('guests can view the login page', function () {
    $response = $this->get('/login');

    $response->assertStatus(200);
});

test('authenticated users are redirected away from the login page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/login');

    $response->assertRedirect('/');
});

test('users can login with correct credentials', function () {
    $user = User::factory()->create([
        'email' => 'login@example.com',
        'password' => 'secret123',
    ]);

    $response = $this->post('/login', [
        'email' => 'login@example.com',
        'password' => 'secret123',
    ]);

    $response->assertRedirect(route('dashboard'));
    $this->assertAuthenticatedAs($user);
});

test('users can login with an email of a different case than stored', function () {
    $user = User::factory()->create([
        'email' => 'casetest@example.com',
        'password' => 'secret123',
    ]);

    $response = $this->post('/login', [
        'email' => 'CaseTest@Example.com',
        'password' => 'secret123',
    ]);

    $response->assertRedirect(route('dashboard'));
    $this->assertAuthenticatedAs($user);
});

test('users cannot login with an incorrect password', function () {
    User::factory()->create([
        'email' => 'login2@example.com',
        'password' => 'secret123',
    ]);

    $response = $this->post('/login', [
        'email' => 'login2@example.com',
        'password' => 'wrong-password',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('users cannot login with an unregistered email', function () {
    $response = $this->post('/login', [
        'email' => 'nobody@example.com',
        'password' => 'whatever123',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('login requires an email', function () {
    $response = $this->post('/login', [
        'password' => 'secret123',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('login requires a password', function () {
    $response = $this->post('/login', [
        'email' => 'login@example.com',
    ]);

    $response->assertSessionHasErrors('password');
    $this->assertGuest();
});

test('login allows a short legacy password to still authenticate', function () {
    $user = User::factory()->create([
        'email' => 'shortpass@example.com',
        'password' => 'ab12',
    ]);

    $response = $this->post('/login', [
        'email' => 'shortpass@example.com',
        'password' => 'ab12',
    ]);

    $response->assertRedirect(route('dashboard'));
    $this->assertAuthenticatedAs($user);
});

test('login with remember me sets a remember token', function () {
    $user = User::factory()->create([
        'email' => 'remember@example.com',
        'password' => 'secret123',
    ]);

    $this->post('/login', [
        'email' => 'remember@example.com',
        'password' => 'secret123',
        'remember' => true,
    ]);

    expect($user->fresh()->remember_token)->not->toBeNull();
});

test('login is rate limited after five failed attempts', function () {
    User::factory()->create([
        'email' => 'ratelimited@example.com',
        'password' => 'secret123',
    ]);

    for ($i = 0; $i < 5; $i++) {
        $this->post('/login', [
            'email' => 'ratelimited@example.com',
            'password' => 'wrong-password',
        ]);
    }

    $response = $this->post('/login', [
        'email' => 'ratelimited@example.com',
        'password' => 'secret123',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('a successful login clears prior failed rate limiter attempts', function () {
    $user = User::factory()->create([
        'email' => 'clears@example.com',
        'password' => 'secret123',
    ]);

    $this->post('/login', [
        'email' => 'clears@example.com',
        'password' => 'wrong-password',
    ]);

    $response = $this->post('/login', [
        'email' => 'clears@example.com',
        'password' => 'secret123',
    ]);

    $response->assertRedirect(route('dashboard'));
    $this->assertAuthenticatedAs($user);
});

test('authenticated users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/logout');

    $response->assertRedirect('/');
    $this->assertGuest();
});

test('guests cannot access the logout route', function () {
    $response = $this->post('/logout');

    $response->assertRedirect(route('login'));
});

test('guests are redirected to login when accessing a protected route', function () {
    $response = $this->get('/');

    $response->assertRedirect(route('login'));
});

test('logging out removes the session from the registry when one is in use', function () {
    $user = User::factory()->create();
    $registry = Mockery::mock(SessionRegistry::class);
    $registry->shouldReceive('enabled')->andReturnTrue();
    $registry->shouldReceive('touch');
    $registry->shouldReceive('forget')->once()->with($user->id, Mockery::type('string'));
    $this->app->instance(SessionRegistry::class, $registry);

    $this->actingAs($user)->post('/logout')->assertRedirect('/');
});
