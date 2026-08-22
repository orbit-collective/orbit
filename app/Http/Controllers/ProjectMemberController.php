<?php

namespace App\Http\Controllers;

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\Role;
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
        $this->authorize('updateMemberRole', $project);

        $validated = $request->validate([
            'role' => ['required', Rule::enum(RoleType::class)->except([RoleType::OWNER, RoleType::CUSTOM])],
        ]);

        $this->projectMemberService->updateRole($project, $user, RoleType::from($validated['role']));

        return redirect()->back()->with('success', "$user->name's role has been updated.");
    }

    public function destroy(Project $project, User $user): RedirectResponse
    {
        $this->authorize('removeMember', $project);

        $this->projectMemberService->removeMember($project, $user);

        return redirect()->back()->with('success', "$user->name has been removed from the project.");
    }

    public function syncRoles(Request $request, Project $project, User $user): RedirectResponse
    {
        $this->authorize('assign', [Role::class, $project]);

        $validated = $request->validate([
            'roles' => ['present', 'array'],
            'roles.*' => ['integer', Rule::exists('roles', 'id')->where('project_id', $project->id)],
        ]);

        $this->projectMemberService->syncRoles($project, $user, $validated['roles']);

        return redirect()->back()->with('success', "$user->name's roles have been updated.");
    }

    public function transferOwnership(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('transferOwnership', $project);

        $validated = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('project_user', 'user_id')->where('project_id', $project->id)],
        ]);

        $newOwner = User::findOrFail($validated['user_id']);

        $this->projectMemberService->transferOwnership($project, $request->user(), $newOwner);

        return redirect()->back()->with('success', "Ownership has been transferred to $newOwner->name.");
    }
}
