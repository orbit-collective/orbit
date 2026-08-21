<?php

namespace App\Http\Controllers;

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\Role;
use App\Services\RoleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class RoleController extends Controller
{
    public function __construct(
        protected RoleService $roleService
    ) {}

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('create', [Role::class, $project]);

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
        $this->ensureRoleBelongsToProject($project, $role);
        $this->authorize('update', $role);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash'],
        ]);

        $this->roleService->updateRole($project, $role, $validated);

        return redirect()->back()->with('success', "The \"{$validated['name']}\" role has been updated.");
    }

    public function destroy(Project $project, Role $role): RedirectResponse
    {
        $this->ensureRoleBelongsToProject($project, $role);
        $this->authorize('delete', $role);

        $this->roleService->deleteRole($project, $role);

        return redirect()->back()->with('success', "The \"$role->name\" role has been deleted.");
    }

    private function ensureRoleBelongsToProject(Project $project, Role $role): void
    {
        if ($role->project_id !== $project->id) {
            throw new NotFoundHttpException;
        }
    }
}
