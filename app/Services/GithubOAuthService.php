<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Contracts\User as SocialiteUser;

/**
 * Turns a GitHub OAuth callback into one of three outcomes: sign in an
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
    public function loginOrRegister(SocialiteUser $githubUser): User
    {
        $githubId = (string) $githubUser->getId();

        if ($user = $this->userRepository->findByGithubId($githubId)) {
            Auth::login($user);

            return $user;
        }

        $email = $githubUser->getEmail();

        if ($email && $user = $this->userRepository->findByEmail($email)) {
            $this->assertGithubIdIsFree($githubId, $user);
            $this->userRepository->linkGithubAccount($user, $githubId, (string) $githubUser->getNickname());
            $this->activityLogService->log(null, 'Linked a GitHub account (matched by email)', $user->id);
            Auth::login($user);

            return $user;
        }

        if (! $email) {
            throw ValidationException::withMessages([
                'github' => 'Your GitHub account needs a public email address to sign up with it.',
            ]);
        }

        $user = $this->userRepository->create([
            'name' => $githubUser->getName() ?: $githubUser->getNickname(),
            'email' => $email,
            'password' => null,
            'github_id' => $githubId,
            'github_username' => $githubUser->getNickname(),
        ]);

        event(new Registered($user));
        Auth::login($user);

        return $user;
    }

    /**
     * Links GitHub to an already-authenticated user, e.g. from Settings.
     */
    public function linkToUser(User $user, SocialiteUser $githubUser): User
    {
        $githubId = (string) $githubUser->getId();

        $this->assertGithubIdIsFree($githubId, $user);

        $linked = $this->userRepository->linkGithubAccount($user, $githubId, (string) $githubUser->getNickname());

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
