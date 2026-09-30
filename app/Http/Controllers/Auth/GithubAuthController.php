<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\GithubOAuthService;
use App\Services\Integrations\Github\OrbitRelayApiException;
use App\Services\Integrations\Github\OrbitRelayClient;
use App\Services\ProjectInvitationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * "Log in with GitHub" for guests, and "Link your GitHub account" for an
 * already-authenticated user (the Security & Access settings page) - a
 * single redirect/callback pair handles both, branching on whether the
 * request already has a user, exactly like GithubOAuthService does.
 *
 * Neither action ever talks to GitHub directly: this Orbit Local instance
 * has no GitHub OAuth App of its own. Both hand off to orbit-api's
 * centralized sign-in broker (see documentation/en/authentication), which
 * owns the one GitHub App/OAuth client shared by every Orbit Local
 * installation. `redirect()` starts that hand-off; `callback()` receives a
 * short-lived, single-use `exchange_token` back and redeems it
 * server-to-server via OrbitRelayClient::resolveGithubLoginToken() - never a
 * GitHub access token, just the safe profile fields needed to log in.
 */
class GithubAuthController extends Controller
{
    private const string STATE_SESSION_KEY = 'github_login_state';

    public function __construct(
        protected GithubOAuthService $githubOAuthService,
        protected ProjectInvitationService $projectInvitationService,
        protected OrbitRelayClient $relayClient,
    ) {}

    public function redirect(Request $request): RedirectResponse
    {
        $state = Str::random(40);

        $request->session()->put(self::STATE_SESSION_KEY, $state);

        $returnTo = route('auth.github.callback', ['state' => $state]);
        $orbitApiUrl = rtrim(config('services.orbit_api.url'), '/');

        return redirect()->away("$orbitApiUrl/v1/auth/github/redirect?return_to=".urlencode($returnTo));
    }

    public function callback(Request $request): RedirectResponse
    {
        $expectedState = $request->session()->pull(self::STATE_SESSION_KEY);
        $state = (string) $request->query('state');

        if (! $expectedState || ! hash_equals($expectedState, $state)) {
            return redirect()->route('login')->with('error', 'GitHub authentication failed. Please try again.');
        }

        if ($error = $request->query('error')) {
            return redirect()->route('login')->with('error', $error);
        }

        $exchangeToken = $request->query('exchange_token');

        if (! $exchangeToken) {
            return redirect()->route('login')->with('error', 'GitHub authentication failed. Please try again.');
        }

        try {
            $identity = $this->relayClient->resolveGithubLoginToken($exchangeToken);
        } catch (OrbitRelayApiException) {
            return redirect()->route('login')->with('error', 'GitHub authentication failed. Please try again.');
        }

        if ($request->user()) {
            try {
                $this->githubOAuthService->linkToUser($request->user(), $identity);
            } catch (ValidationException $exception) {
                $message = collect($exception->errors())->flatten()->first() ?? $exception->getMessage();

                return redirect()->route('settings.security-access')->with('error', $message);
            }

            return redirect()->route('settings.security-access')->with('success', 'GitHub account linked.');
        }

        try {
            $user = $this->githubOAuthService->loginOrRegister($identity);
        } catch (ValidationException $exception) {
            $message = collect($exception->errors())->flatten()->first() ?? $exception->getMessage();

            return redirect()->route('login')->with('error', $message);
        }

        $request->session()->regenerate();

        if ($token = $request->session()->pull('pending_invitation_token')) {
            try {
                $project = $this->projectInvitationService->acceptByToken($token, $user);

                return redirect()->route('projects.show', $project->id)
                    ->with('success', "You've joined \"$project->name\".");
            } catch (ValidationException $exception) {
                $message = collect($exception->errors())->flatten()->first() ?? $exception->getMessage();

                return redirect()->route('dashboard')->with('error', $message);
            }
        }

        return redirect()->intended(route('dashboard'));
    }

    public function unlink(Request $request): RedirectResponse
    {
        try {
            $this->githubOAuthService->unlink($request->user());
        } catch (ValidationException $exception) {
            $message = collect($exception->errors())->flatten()->first() ?? $exception->getMessage();

            return redirect()->route('settings.security-access')->with('error', $message);
        }

        return redirect()->route('settings.security-access')->with('success', 'GitHub account unlinked.');
    }
}
