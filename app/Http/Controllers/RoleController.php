<?php

namespace App\Http\Controllers;

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\Role;
use App\Services\RoleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    public function __construct(
        protected RoleService $roleService
    ) {}

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('manageMembers', $project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash'],
            'role' => ['required', Rule::enum(RoleType::class)],
        ]);

        $this->roleService->createRole($project, $validated);

        return redirect()->back()->with('success', "The \"{$validated['name']}\" role has been created.");
    }

    public function update(Request $request, Project $project, Role $role): RedirectResponse
    {
        $this->authorize('manageMembers', $project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash'],
        ]);

        $this->roleService->updateRole($project, $role, $validated);

        return redirect()->back()->with('success', "The \"{$validated['name']}\" role has been updated.");
    }

    public function destroy(Project $project, Role $role): RedirectResponse
    {
        $this->authorize('manageMembers', $project);

        $this->roleService->deleteRole($project, $role);

        return redirect()->back()->with('success', "The \"$role->name\" role has been deleted.");
    }
}
