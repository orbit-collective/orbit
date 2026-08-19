<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuthService;
use App\Services\ProjectInvitationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    public function __construct(
        protected AuthService $authService,
        protected ProjectInvitationService $projectInvitationService
    ) {}

    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:30|min:3',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = $this->authService->register($data);

        if ($token = $request->session()->pull('pending_invitation_token')) {
            try {
                $project = $this->projectInvitationService->acceptByToken($token, $user);

                return redirect()->route('projects.show', $project->id)
                    ->with('success', "You've joined \"{$project->name}\".");
            } catch (ValidationException $exception) {
                return redirect()->route('dashboard')->with('error', $exception->getMessage());
            }
        }

        return redirect()->route('dashboard');
    }
}
