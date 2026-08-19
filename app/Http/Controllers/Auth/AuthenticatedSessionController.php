<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\ProjectInvitationService;
use Auth;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function __construct(
        protected ProjectInvitationService $projectInvitationService
    ) {}

    public function create(): Response
    {
        return Inertia::render('Auth/Login');
    }

    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();
        $request->session()->regenerate();

        if ($token = $request->session()->pull('pending_invitation_token')) {
            try {
                $project = $this->projectInvitationService->acceptByToken($token, $request->user());

                return redirect()->route('projects.show', $project->id)
                    ->with('success', "You've joined \"{$project->name}\".");
            } catch (ValidationException $exception) {
                $message = collect($exception->errors())->flatten()->first() ?? $exception->getMessage();

                return redirect()->intended(route('dashboard'))->with('error', $message);
            }
        }

        return redirect()->intended(route('dashboard'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
