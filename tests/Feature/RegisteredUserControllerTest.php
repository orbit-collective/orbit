<?php

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;

test('guests can view the registration page', function () {
    $response = $this->get('/register');

    $response->assertStatus(200);
});

test('authenticated users are redirected away from the registration page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/register');

    $response->assertRedirect('/');
});

test('a new user can register', function () {
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertRedirect(route('dashboard'));
    $this->assertAuthenticated();
    $this->assertDatabaseHas('users', ['email' => 'test@example.com']);

    $user = User::where('email', 'test@example.com')->first();
    expect(Hash::check('password123', $user->password))->toBeTrue();
});

test('registering fires the Registered event', function () {
    Event::fake();

    $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    Event::assertDispatched(Registered::class);
});

test('the first registered user becomes an admin', function () {
    $this->post('/register', [
        'name' => 'First User',
        'email' => 'first@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $user = User::where('email', 'first@example.com')->first();

    expect($user->role)->toBe(UserRole::ADMIN);
});

test('subsequent registered users become members', function () {
    User::factory()->create();

    $this->post('/register', [
        'name' => 'Second User',
        'email' => 'second@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $user = User::where('email', 'second@example.com')->first();

    expect($user->role)->toBe(UserRole::MEMBER);
});

test('the third and later registered users also become members', function () {
    User::factory()->count(2)->create();

    $this->post('/register', [
        'name' => 'Third User',
        'email' => 'third@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $user = User::where('email', 'third@example.com')->first();

    expect($user->role)->toBe(UserRole::MEMBER);
});

test('registration requires a name', function () {
    $response = $this->post('/register', [
        'email' => 'test@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertSessionHasErrors('name');
    $this->assertGuest();
});

test('registration requires a valid email', function () {
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'not-an-email',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('registration requires a lowercase email', function () {
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'Test@Example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('registration requires a unique email', function () {
    User::factory()->create(['email' => 'taken@example.com']);

    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'taken@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('registration requires the password confirmation to match', function () {
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password123',
        'password_confirmation' => 'does-not-match',
    ]);

    $response->assertSessionHasErrors('password');
    $this->assertGuest();
    $this->assertDatabaseMissing('users', ['email' => 'test@example.com']);
});

test('registration enforces the minimum password length policy', function () {
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'short1',
        'password_confirmation' => 'short1',
    ]);

    $response->assertSessionHasErrors('password');
    $this->assertGuest();
});
