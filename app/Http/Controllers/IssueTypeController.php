<?php

namespace App\Http\Controllers;

use App\Enums\Permissions\RoleType;
use App\Models\IssueType;
use App\Models\Project;
use App\Services\IssueTypeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class IssueTypeController extends Controller
{
    public function __construct(
        protected IssueTypeService $issueTypeService
    ) {}

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('createIssueTypes', $project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'icon' => ['required', 'string', 'max:50'],
            'color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'description' => ['nullable', 'string', 'max:255'],
            'allows_children' => ['sometimes', 'boolean'],
            'is_top_level' => ['sometimes', 'boolean'],
            'required_fields' => ['sometimes', 'array'],
            'required_fields.*' => ['string', Rule::in(array_keys(IssueTypeService::REQUIRED_FIELD_TO_DATA_KEY))],
            'restricted_role_types' => ['sometimes', 'array'],
            'restricted_role_types.*' => ['string', Rule::in(array_map(fn (RoleType $role) => $role->value, [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER, RoleType::VIEWER]))],
        ]);

        // A custom type can otherwise be created before the project's
        // starter catalog is seeded - if its name collides with a system
        // type (e.g. "Bug"), ensureSystemIssueTypes()'s later firstOrCreate()
        // would just find this custom row and leave it as-is, permanently
        // losing the real system type under that name.
        $this->issueTypeService->ensureSystemIssueTypes($project);

        $this->issueTypeService->createIssueType($project, $validated);

        return redirect()->back()->with('success', "The \"{$validated['name']}\" issue type has been created.");
    }

    public function update(Request $request, Project $project, IssueType $issueType): RedirectResponse
    {
        $this->ensureIssueTypeBelongsToProject($project, $issueType);
        $this->authorize('updateIssueTypes', $project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'icon' => ['required', 'string', 'max:50'],
            'color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'description' => ['nullable', 'string', 'max:255'],
            'allows_children' => ['sometimes', 'boolean'],
            'is_top_level' => ['sometimes', 'boolean'],
            'required_fields' => ['sometimes', 'array'],
            'required_fields.*' => ['string', Rule::in(array_keys(IssueTypeService::REQUIRED_FIELD_TO_DATA_KEY))],
            'restricted_role_types' => ['sometimes', 'array'],
            'restricted_role_types.*' => ['string', Rule::in(array_map(fn (RoleType $role) => $role->value, [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER, RoleType::VIEWER]))],
        ]);

        $this->issueTypeService->updateIssueType($project, $issueType, $validated);

        return redirect()->back()->with('success', "The \"{$validated['name']}\" issue type has been updated.");
    }

    public function updateAllowedChildren(Request $request, Project $project, IssueType $issueType): RedirectResponse
    {
        $this->ensureIssueTypeBelongsToProject($project, $issueType);
        $this->authorize('updateIssueTypes', $project);

        $validated = $request->validate([
            'child_issue_type_ids' => ['present', 'array'],
            'child_issue_type_ids.*' => ['integer', Rule::exists('issue_types', 'id')->where('project_id', $project->id)],
        ]);

        $this->issueTypeService->syncAllowedChildTypes($project, $issueType, $validated['child_issue_type_ids']);

        return redirect()->back()->with('success', "Updated which types can be sub-issues of \"$issueType->name\".");
    }

    public function destroy(Project $project, IssueType $issueType): RedirectResponse
    {
        $this->ensureIssueTypeBelongsToProject($project, $issueType);
        $this->authorize('deleteIssueTypes', $project);

        $name = $issueType->name;

        $this->issueTypeService->deleteIssueType($project, $issueType);

        return redirect()->back()->with('success', "The \"$name\" issue type has been deleted.");
    }

    private function ensureIssueTypeBelongsToProject(Project $project, IssueType $issueType): void
    {
        if ($issueType->project_id !== $project->id) {
            throw new NotFoundHttpException;
        }
    }
}
