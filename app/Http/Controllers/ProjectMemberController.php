<?php

namespace App\Http\Controllers;

use App\Enums\ProjectRole;
use App\Models\Project;
use App\Models\User;
use App\Services\ProjectMemberService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProjectMemberController extends Controller
{
    public function __construct(
        protected ProjectMemberService $projectMemberService
    ) {}

    public function updateRole(Request $request, Project $project, User $user): RedirectResponse
    {
        $this->authorize('manageMembers', $project);

        $validated = $request->validate([
            'role' => ['required', Rule::enum(ProjectRole::class)],
        ]);

        $this->projectMemberService->updateRole($project, $user, ProjectRole::from($validated['role']));

        return redirect()->back()->with('success', "$user->name's role has been updated.");
    }

    public function destroy(Project $project, User $user): RedirectResponse
    {
        $this->authorize('manageMembers', $project);

        $this->projectMemberService->removeMember($project, $user);

        return redirect()->back()->with('success', "$user->name has been removed from the project.");
    }
}
