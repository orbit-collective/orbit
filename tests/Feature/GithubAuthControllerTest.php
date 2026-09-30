<?php

use App\Models\User;
use Laravel\Socialite\Contracts\Provider as SocialiteProvider;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;

function fakeSocialiteProviderReturning(SocialiteUser $user): SocialiteProvider
{
    $provider = Mockery::mock(SocialiteProvider::class);
    $provider->shouldReceive('user')->andReturn($user);

    Socialite::shouldReceive('driver')->with('github')->andReturn($provider);

    return $provider;
}

function fakeSocialiteGithubUser(string $id = '123', ?string $email = 'octocat@example.com', string $nickname = 'octocat'): SocialiteUser
{
    $user = Mockery::mock(SocialiteUser::class);
    $user->shouldReceive('getId')->andReturn($id);
    $user->shouldReceive('getEmail')->andReturn($email);
    $user->shouldReceive('getNickname')->andReturn($nickname);
    $user->shouldReceive('getName')->andReturn('The Octocat');

    return $user;
}

test('the redirect route delegates to the GitHub Socialite driver', function () {
    $provider = Mockery::mock(SocialiteProvider::class);
    $provider->shouldReceive('redirect')->once()->andReturn(redirect('https://github.com/login/oauth/authorize'));

    Socialite::shouldReceive('driver')->with('github')->andReturn($provider);

    $response = $this->get(route('auth.github.redirect'));

    $response->assertRedirect('https://github.com/login/oauth/authorize');
});

test('a guest with a new GitHub account is registered and signed in', function () {
    fakeSocialiteProviderReturning(fakeSocialiteGithubUser(email: 'brandnew@example.com'));

    $response = $this->get(route('auth.github.callback'));

    $response->assertRedirect(route('dashboard'));
    $this->assertAuthenticated();
    $this->assertDatabaseHas('users', ['email' => 'brandnew@example.com', 'github_id' => '123']);
});

test('a guest with an already-linked GitHub account is signed in', function () {
    $user = User::factory()->create(['github_id' => '123']);

    fakeSocialiteProviderReturning(fakeSocialiteGithubUser());

    $response = $this->get(route('auth.github.callback'));

    $response->assertRedirect(route('dashboard'));
    $this->assertAuthenticatedAs($user);
});

test('a GitHub authentication failure redirects to login with an error', function () {
    $provider = Mockery::mock(SocialiteProvider::class);
    $provider->shouldReceive('user')->andThrow(new Exception('denied'));
    Socialite::shouldReceive('driver')->with('github')->andReturn($provider);

    $response = $this->get(route('auth.github.callback'));

    $response->assertRedirect(route('login'));
    $response->assertSessionHas('error');
    $this->assertGuest();
});

test('an authenticated user linking GitHub is redirected back to security settings', function () {
    $user = User::factory()->create(['github_id' => null]);

    fakeSocialiteProviderReturning(fakeSocialiteGithubUser());

    $response = $this->actingAs($user)->get(route('auth.github.callback'));

    $response->assertRedirect(route('settings.security-access'));
    $response->assertSessionHas('success');
    expect($user->fresh()->github_id)->toBe('123');
});

test('linking a GitHub account already claimed by someone else fails with an error', function () {
    User::factory()->create(['github_id' => '123']);
    $user = User::factory()->create(['github_id' => null]);

    fakeSocialiteProviderReturning(fakeSocialiteGithubUser());

    $response = $this->actingAs($user)->get(route('auth.github.callback'));

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
