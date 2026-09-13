<?php

namespace App\Http\Controllers;

use App\Enums\IssueFieldType;
use App\Models\IssueType;
use App\Models\IssueTypeField;
use App\Models\Project;
use App\Services\IssueTypeFieldService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class IssueTypeFieldController extends Controller
{
    public function __construct(
        protected IssueTypeFieldService $issueTypeFieldService
    ) {}

    public function store(Request $request, Project $project, IssueType $issueType): RedirectResponse
    {
        $this->ensureIssueTypeBelongsToProject($project, $issueType);
        $this->authorize('updateIssueTypes', $project);

        $validated = $this->validateField($request);

        $field = $this->issueTypeFieldService->createField($issueType, $validated);

        return redirect()->back()->with('success', "The \"$field->label\" field has been added.");
    }

    public function update(Request $request, Project $project, IssueType $issueType, IssueTypeField $field): RedirectResponse
    {
        $this->ensureIssueTypeBelongsToProject($project, $issueType);
        $this->ensureFieldBelongsToType($issueType, $field);
        $this->authorize('updateIssueTypes', $project);

        $validated = $this->validateField($request);

        $field = $this->issueTypeFieldService->updateField($issueType, $field, $validated);

        return redirect()->back()->with('success', "The \"$field->label\" field has been updated.");
    }

    public function destroy(Project $project, IssueType $issueType, IssueTypeField $field): RedirectResponse
    {
        $this->ensureIssueTypeBelongsToProject($project, $issueType);
        $this->ensureFieldBelongsToType($issueType, $field);
        $this->authorize('updateIssueTypes', $project);

        $label = $field->label;

        $this->issueTypeFieldService->deleteField($issueType, $field);

        return redirect()->back()->with('success', "The \"$label\" field has been removed.");
    }

    private function validateField(Request $request): array
    {
        return $request->validate([
            'label' => ['required', 'string', 'max:50'],
            'type' => ['required', Rule::enum(IssueFieldType::class)],
            'options' => ['sometimes', 'array'],
            'options.*' => ['nullable', 'string', 'max:50'],
            'placeholder' => ['sometimes', 'nullable', 'string', 'max:100'],
            'is_required' => ['sometimes', 'boolean'],
        ]);
    }

    private function ensureIssueTypeBelongsToProject(Project $project, IssueType $issueType): void
    {
        if ($issueType->project_id !== $project->id) {
            throw new NotFoundHttpException;
        }
    }

    private function ensureFieldBelongsToType(IssueType $issueType, IssueTypeField $field): void
    {
        if ($field->issue_type_id !== $issueType->id) {
            throw new NotFoundHttpException;
        }
    }
}
