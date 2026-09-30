<?php

namespace App\Services;

use App\DataTransferObjects\Github\GithubIdentityDTO;
use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * Turns a resolved GitHub identity (see OrbitRelayClient::resolveGithubLoginToken(),
 * documentation/en/authentication) into one of three outcomes: sign in an
 * existing linked account, link GitHub to the currently authenticated
 * account, or (for a guest with no matching account) register a brand new
 * one. This is a separate identity from the GitHub App installation used by
 * the repository integration (app/Services/Integrations/Github) - linking
 * here only proves "this Orbit user owns this GitHub account," it never
 * grants repository access.
 */
class GithubOAuthService
{
    public function __construct(
        protected UserRepository $userRepository,
        protected ActivityLogService $activityLogService
    ) {}

    /**
     * Resolves the guest sign-in flow: an existing link signs the user in,
     * a matching verified email auto-links (GitHub already proved the
     * caller owns that email), and anything else registers a new account.
     */
    public function loginOrRegister(GithubIdentityDTO $identity): User
    {
        if ($user = $this->userRepository->findByGithubId($identity->githubId)) {
            Auth::login($user);

            return $user;
        }

        if ($identity->email && $user = $this->userRepository->findByEmail($identity->email)) {
            // Auto-linking by email only applies to an account with no GitHub
            // link yet - otherwise a GitHub account that happens to share an
            // email with an already-linked Orbit account (e.g. a reassigned
            // address) could silently take over that account by replacing
            // its existing github_id.
            if ($user->github_id !== null) {
                throw ValidationException::withMessages([
                    'github' => 'This email address already belongs to an Orbit account linked to a different GitHub account.',
                ]);
            }

            $this->assertGithubIdIsFree($identity->githubId, $user);
            $this->userRepository->linkGithubAccount($user, $identity->githubId, $identity->githubUsername);
            $this->activityLogService->log(null, 'Linked a GitHub account (matched by email)', $user->id);
            Auth::login($user);

            return $user;
        }

        if (! $identity->email) {
            throw ValidationException::withMessages([
                'github' => 'Your GitHub account needs a public email address to sign up with it.',
            ]);
        }

        $user = $this->userRepository->create([
            'name' => $identity->name ?: $identity->githubUsername,
            'email' => $identity->email,
            'password' => null,
            'github_id' => $identity->githubId,
            'github_username' => $identity->githubUsername,
        ]);

        event(new Registered($user));
        Auth::login($user);

        return $user;
    }

    /**
     * Links GitHub to an already-authenticated user, e.g. from Settings.
     */
    public function linkToUser(User $user, GithubIdentityDTO $identity): User
    {
        $this->assertGithubIdIsFree($identity->githubId, $user);

        $linked = $this->userRepository->linkGithubAccount($user, $identity->githubId, $identity->githubUsername);

        $this->activityLogService->log(null, 'Linked their GitHub account', $user->id);

        return $linked;
    }

    /**
     * A GitHub-only account (no password) would be locked out entirely if
     * unlinked, so unlinking requires a password to already be set.
     */
    public function unlink(User $user): User
    {
        if (! $user->password) {
            throw ValidationException::withMessages([
                'github' => 'Set a password before unlinking your GitHub account, so you can still sign in.',
            ]);
        }

        $unlinked = $this->userRepository->unlinkGithubAccount($user);

        $this->activityLogService->log(null, 'Unlinked their GitHub account', $user->id);

        return $unlinked;
    }

    private function assertGithubIdIsFree(string $githubId, User $exceptUser): void
    {
        $existing = $this->userRepository->findByGithubId($githubId);

        if ($existing && $existing->id !== $exceptUser->id) {
            throw ValidationException::withMessages([
                'github' => 'This GitHub account is already linked to a different Orbit account.',
            ]);
        }
    }
}
