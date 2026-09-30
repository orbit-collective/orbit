<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\GithubOAuthService;
use App\Services\ProjectInvitationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

/**
 * "Log in with GitHub" for guests, and "Link your GitHub account" for an
 * already-authenticated user (the Security & Access settings page) - a
 * single redirect/callback pair handles both, branching on whether the
 * request already has a user, exactly like GithubOAuthService does.
 */
class GithubAuthController extends Controller
{
    public function __construct(
        protected GithubOAuthService $githubOAuthService,
        protected ProjectInvitationService $projectInvitationService
    ) {}

    public function redirect(): mixed
    {
        return Socialite::driver('github')->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        try {
            $githubUser = Socialite::driver('github')->user();
        } catch (Throwable) {
            return redirect()->route('login')->with('error', 'GitHub authentication failed. Please try again.');
        }

        if ($request->user()) {
            try {
                $this->githubOAuthService->linkToUser($request->user(), $githubUser);
            } catch (ValidationException $exception) {
                $message = collect($exception->errors())->flatten()->first() ?? $exception->getMessage();

                return redirect()->route('settings.security-access')->with('error', $message);
            }

            return redirect()->route('settings.security-access')->with('success', 'GitHub account linked.');
        }

        try {
            $user = $this->githubOAuthService->loginOrRegister($githubUser);
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
