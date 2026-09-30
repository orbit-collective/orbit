<?php

use App\DataTransferObjects\Github\GithubIdentityDTO;
use App\Models\User;
use App\Services\GithubOAuthService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = app(GithubOAuthService::class);
});

function fakeGithubUser(string $id = '123', ?string $email = 'octocat@example.com', string $nickname = 'octocat', ?string $name = 'The Octocat'): GithubIdentityDTO
{
    return new GithubIdentityDTO(
        githubId: $id,
        githubUsername: $nickname,
        email: $email,
        name: $name,
    );
}

test('loginOrRegister signs in an existing linked account', function () {
    $user = User::factory()->create(['github_id' => '123', 'github_username' => 'octocat']);

    $result = $this->service->loginOrRegister(fakeGithubUser());

    expect($result->id)->toBe($user->id);
    $this->assertAuthenticatedAs($user);
});

test('loginOrRegister links by matching email for an unlinked account', function () {
    $user = User::factory()->create(['email' => 'octocat@example.com', 'github_id' => null]);

    $result = $this->service->loginOrRegister(fakeGithubUser());

    expect($result->fresh()->github_id)->toBe('123');
    $this->assertAuthenticatedAs($user);
});

test('loginOrRegister registers a brand new account when nothing matches', function () {
    Event::fake();

    $result = $this->service->loginOrRegister(fakeGithubUser(email: 'new-person@example.com'));

    expect($result->email)->toBe('new-person@example.com')
        ->and($result->password)->toBeNull()
        ->and($result->github_id)->toBe('123');
    Event::assertDispatched(Registered::class);
    $this->assertAuthenticatedAs($result);
});

test('loginOrRegister rejects a GitHub account with no public email', function () {
    expect(fn () => $this->service->loginOrRegister(fakeGithubUser(email: null)))
        ->toThrow(ValidationException::class);
    $this->assertGuest();
});

test('linkToUser links GitHub to the given user', function () {
    $user = User::factory()->create();

    $this->service->linkToUser($user, fakeGithubUser());

    expect($user->fresh()->github_id)->toBe('123')
        ->and($user->fresh()->github_username)->toBe('octocat');
});

test('linkToUser rejects a GitHub account already linked to someone else', function () {
    User::factory()->create(['github_id' => '123']);
    $user = User::factory()->create();

    expect(fn () => $this->service->linkToUser($user, fakeGithubUser()))
        ->toThrow(ValidationException::class);
    expect($user->fresh()->github_id)->toBeNull();
});

test('unlink clears the GitHub link when a password is set', function () {
    $user = User::factory()->create(['github_id' => '123', 'github_username' => 'octocat', 'password' => 'secret123']);

    $this->service->unlink($user);

    expect($user->fresh()->github_id)->toBeNull()
        ->and($user->fresh()->github_username)->toBeNull();
});

test('unlink is rejected when the account has no password set', function () {
    $user = User::factory()->create(['github_id' => '123', 'password' => null]);

    expect(fn () => $this->service->unlink($user))
        ->toThrow(ValidationException::class);
    expect($user->fresh()->github_id)->toBe('123');
});
