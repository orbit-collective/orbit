<?php

namespace App\Http\Controllers;

use App\Models\IssueType;
use App\Models\IssueTypeTemplate;
use App\Models\Project;
use App\Services\IssueTypeTemplateService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class IssueTypeTemplateController extends Controller
{
    public function __construct(
        protected IssueTypeTemplateService $issueTypeTemplateService
    ) {}

    public function store(Request $request, Project $project, IssueType $issueType): RedirectResponse
    {
        $this->ensureIssueTypeBelongsToProject($project, $issueType);
        $this->authorize('updateIssueTypes', $project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'default_priority' => ['nullable', 'string'],
            'default_labels' => ['sometimes', 'array'],
            'default_labels.*' => ['string'],
        ]);

        $this->issueTypeTemplateService->createTemplate($issueType, $validated);

        return redirect()->back()->with('success', "The \"{$validated['name']}\" template has been created.");
    }

    public function update(Request $request, Project $project, IssueType $issueType, IssueTypeTemplate $template): RedirectResponse
    {
        $this->ensureIssueTypeBelongsToProject($project, $issueType);
        $this->ensureTemplateBelongsToType($issueType, $template);
        $this->authorize('updateIssueTypes', $project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'default_priority' => ['nullable', 'string'],
            'default_labels' => ['sometimes', 'array'],
            'default_labels.*' => ['string'],
        ]);

        $this->issueTypeTemplateService->updateTemplate($issueType, $template, $validated);

        return redirect()->back()->with('success', "The \"{$validated['name']}\" template has been updated.");
    }

    public function destroy(Project $project, IssueType $issueType, IssueTypeTemplate $template): RedirectResponse
    {
        $this->ensureIssueTypeBelongsToProject($project, $issueType);
        $this->ensureTemplateBelongsToType($issueType, $template);
        $this->authorize('updateIssueTypes', $project);

        $name = $template->name;

        $this->issueTypeTemplateService->deleteTemplate($issueType, $template);

        return redirect()->back()->with('success', "The \"$name\" template has been deleted.");
    }

    private function ensureIssueTypeBelongsToProject(Project $project, IssueType $issueType): void
    {
        if ($issueType->project_id !== $project->id) {
            throw new NotFoundHttpException;
        }
    }

    private function ensureTemplateBelongsToType(IssueType $issueType, IssueTypeTemplate $template): void
    {
        if ($template->issue_type_id !== $issueType->id) {
            throw new NotFoundHttpException;
        }
    }
}
