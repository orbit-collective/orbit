<?php

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;

function fakeGithubResolve(array $overrides = []): void
{
    Http::fake([
        '*/v1/auth/github/resolve' => Http::response([
            'success' => true,
            'data' => array_merge([
                'githubId' => '123',
                'githubUsername' => 'octocat',
                'email' => 'octocat@example.com',
                'name' => 'The Octocat',
            ], $overrides),
        ], 200),
    ]);
}

function fakeGithubResolveFailure(string $code = 'INVALID_EXCHANGE_TOKEN'): void
{
    Http::fake([
        '*/v1/auth/github/resolve' => Http::response([
            'success' => false,
            'error' => ['code' => $code, 'message' => 'This GitHub login token is invalid or was already used.'],
        ], 410),
    ]);
}

/**
 * Drives the controller's redirect() step first, so the session actually
 * holds the CSRF state it generated, then follows up on callback() with
 * that same state - mirroring how orbit-api's broker echoes the state back
 * unchanged once GitHub's OAuth round-trip completes.
 */
function callbackWithState(array $query = []): TestResponse
{
    test()->get(route('auth.github.redirect'));
    $state = session('github_login_state')['state'];

    return test()->get(route('auth.github.callback', array_merge(['state' => $state], $query)));
}

test('the redirect route hands off to the orbit-api sign-in broker', function () {
    $response = $this->get(route('auth.github.redirect'));

    $location = $response->headers->get('Location');

    expect($location)->toStartWith(rtrim(config('services.orbit_api.url'), '/').'/v1/auth/github/redirect?return_to=');
    expect(session('github_login_state'))->not->toBeNull();
});

test('a guest with a new GitHub account is registered and signed in', function () {
    fakeGithubResolve(['email' => 'brandnew@example.com']);

    $response = callbackWithState(['exchange_token' => 'a-token']);

    $response->assertRedirect(route('dashboard'));
    $this->assertAuthenticated();
    $this->assertDatabaseHas('users', ['email' => 'brandnew@example.com', 'github_id' => '123']);
});

test('a guest with an already-linked GitHub account is signed in', function () {
    $user = User::factory()->create(['github_id' => '123']);

    fakeGithubResolve();

    $response = callbackWithState(['exchange_token' => 'a-token']);

    $response->assertRedirect(route('dashboard'));
    $this->assertAuthenticatedAs($user);
});

test('a mismatched or missing state redirects to login with an error', function () {
    $response = $this->get(route('auth.github.callback', ['state' => 'bogus', 'exchange_token' => 'a-token']));

    $response->assertRedirect(route('login'));
    $response->assertSessionHas('error');
    $this->assertGuest();
});

test('an error from the broker redirects to login with that message', function () {
    $response = callbackWithState(['error' => 'GitHub authentication failed.']);

    $response->assertRedirect(route('login'));
    $response->assertSessionHas('error');
    $this->assertGuest();
});

test('an invalid exchange token redirects to login with an error', function () {
    fakeGithubResolveFailure();

    $response = callbackWithState(['exchange_token' => 'a-token']);

    $response->assertRedirect(route('login'));
    $response->assertSessionHas('error');
    $this->assertGuest();
});

test('a session that authenticates mid-flow does not silently switch to linking', function () {
    // Started as a guest...
    $this->get(route('auth.github.redirect'));
    $state = session('github_login_state')['state'];

    // ...but logs in via another tab before GitHub redirects back.
    $user = User::factory()->create();
    $this->actingAs($user);

    fakeGithubResolve();

    $response = $this->get(
        route('auth.github.callback', ['state' => $state, 'exchange_token' => 'a-token']),
    );

    $response->assertRedirect(route('settings.security-access'));
    $response->assertSessionHas('error');
    expect($user->fresh()->github_id)->toBeNull();
});

test('an authenticated user linking GitHub is redirected back to security settings', function () {
    $user = User::factory()->create(['github_id' => null]);

    fakeGithubResolve();

    $response = $this->actingAs($user)->get(
        route('auth.github.redirect'),
    );
    $state = session('github_login_state')['state'];

    $response = $this->actingAs($user)->get(
        route('auth.github.callback', ['state' => $state, 'exchange_token' => 'a-token']),
    );

    $response->assertRedirect(route('settings.security-access'));
    $response->assertSessionHas('success');
    expect($user->fresh()->github_id)->toBe('123');
});

test('linking a GitHub account already claimed by someone else fails with an error', function () {
    User::factory()->create(['github_id' => '123']);
    $user = User::factory()->create(['github_id' => null]);

    fakeGithubResolve();

    $this->actingAs($user)->get(route('auth.github.redirect'));
    $state = session('github_login_state')['state'];

    $response = $this->actingAs($user)->get(
        route('auth.github.callback', ['state' => $state, 'exchange_token' => 'a-token']),
    );

    $response->assertRedirect(route('settings.security-access'));
    $response->assertSessionHas('error');
    expect($user->fresh()->github_id)->toBeNull();
});

test('a user with a password can unlink their GitHub account', function () {
    $user = User::factory()->create(['github_id' => '123', 'password' => 'secret123']);

    $response = $this->actingAs($user)->delete(route('auth.github.unlink'));

    $response->assertRedirect(route('settings.security-access'));
    $response->assertSessionHas('success');
    expect($user->fresh()->github_id)->toBeNull();
});

test('a user with no password cannot unlink their GitHub account', function () {
    $user = User::factory()->create(['github_id' => '123', 'password' => null]);

    $response = $this->actingAs($user)->delete(route('auth.github.unlink'));

    $response->assertRedirect(route('settings.security-access'));
    $response->assertSessionHas('error');
    expect($user->fresh()->github_id)->toBe('123');
});

test('guests cannot unlink a GitHub account', function () {
    $response = $this->delete(route('auth.github.unlink'));

    $response->assertRedirect(route('login'));
});
