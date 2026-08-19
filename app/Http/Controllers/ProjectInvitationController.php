<?php

namespace App\Http\Controllers;

use App\Enums\ProjectRole;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Services\ProjectInvitationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProjectInvitationController extends Controller
{
    public function __construct(
        protected ProjectInvitationService $projectInvitationService
    ) {}

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('manageMembers', $project);

        $validated = $request->validate([
            'email' => 'required|string|email|max:255',
            'role' => ['required', Rule::enum(ProjectRole::class)],
        ]);

        $this->projectInvitationService->invite(
            $project,
            $validated['email'],
            ProjectRole::from($validated['role']),
            $request->user()
        );

        return redirect()->back()->with('success', "An invitation has been sent to {$validated['email']}.");
    }

    public function destroy(Project $project, ProjectInvitation $invitation): RedirectResponse
    {
        $this->authorize('manageMembers', $project);

        abort_if($invitation->project_id !== $project->id, 404);

        $this->projectInvitationService->revoke($invitation);

        return redirect()->back()->with('success', 'The invitation has been revoked.');
    }

    public function accept(Request $request, string $token): RedirectResponse
    {
        if (! $request->user()) {
            $request->session()->put('pending_invitation_token', $token);

            return redirect()->route('login')
                ->with('information', 'Log in or create an account with the invited email address to join the project.');
        }

        try {
            $project = $this->projectInvitationService->acceptByToken($token, $request->user());
        } catch (ValidationException $exception) {
            return redirect()->route('dashboard')->with('error', $exception->getMessage());
        }

        return redirect()->route('projects.show', $project->id)
            ->with('success', "You've joined \"{$project->name}\".");
    }

    public function acceptManual(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'token' => 'required|string',
        ]);

        $project = $this->projectInvitationService->acceptByToken($validated['token'], $request->user());

        return redirect()->route('projects.show', $project->id)
            ->with('success', "You've joined \"{$project->name}\".");
    }
}
