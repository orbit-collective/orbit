<?php

namespace App\Http\Controllers;

use App\Enums\WorkflowStatusCategory;
use App\Models\IssueType;
use App\Models\Project;
use App\Models\WorkflowStatus;
use App\Models\WorkflowTransition;
use App\Services\WorkflowService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class WorkflowController extends Controller
{
    public function __construct(
        protected WorkflowService $workflowService
    ) {}

    public function storeStatus(Request $request, Project $project, IssueType $issueType): RedirectResponse
    {
        $this->ensureIssueTypeBelongsToProject($project, $issueType);
        $this->authorize('updateWorkflow', $project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'category' => ['required', Rule::enum(WorkflowStatusCategory::class)],
        ]);

        $this->workflowService->createStatus($issueType, $validated);

        return redirect()->back()->with('success', "The \"{$validated['name']}\" status has been added.");
    }

    public function updateStatus(Request $request, Project $project, IssueType $issueType, WorkflowStatus $status): RedirectResponse
    {
        $this->ensureIssueTypeBelongsToProject($project, $issueType);
        $this->ensureStatusBelongsToType($issueType, $status);
        $this->authorize('updateWorkflow', $project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'category' => ['required', Rule::enum(WorkflowStatusCategory::class)],
        ]);

        $this->workflowService->updateStatus($issueType, $status, $validated);

        return redirect()->back()->with('success', "The \"{$validated['name']}\" status has been updated.");
    }

    public function reorderStatuses(Request $request, Project $project, IssueType $issueType): RedirectResponse
    {
        $this->ensureIssueTypeBelongsToProject($project, $issueType);
        $this->authorize('updateWorkflow', $project);

        $validated = $request->validate([
            'status_ids' => ['required', 'array'],
            'status_ids.*' => ['integer'],
        ]);

        $this->workflowService->reorderStatuses($issueType, $validated['status_ids']);

        return redirect()->back()->with('success', 'Workflow order updated.');
    }

    public function makeStatusInitial(Project $project, IssueType $issueType, WorkflowStatus $status): RedirectResponse
    {
        $this->ensureIssueTypeBelongsToProject($project, $issueType);
        $this->ensureStatusBelongsToType($issueType, $status);
        $this->authorize('updateWorkflow', $project);

        $this->workflowService->setInitialStatus($issueType, $status);

        return redirect()->back()->with('success', "New issues now start in \"$status->name\".");
    }

    public function destroyStatus(Project $project, IssueType $issueType, WorkflowStatus $status): RedirectResponse
    {
        $this->ensureIssueTypeBelongsToProject($project, $issueType);
        $this->ensureStatusBelongsToType($issueType, $status);
        $this->authorize('updateWorkflow', $project);

        $name = $status->name;

        $this->workflowService->deleteStatus($issueType, $status);

        return redirect()->back()->with('success', "The \"$name\" status has been removed.");
    }

    public function storeTransition(Request $request, Project $project, IssueType $issueType): RedirectResponse
    {
        $this->ensureIssueTypeBelongsToProject($project, $issueType);
        $this->authorize('updateWorkflow', $project);

        $validated = $request->validate([
            'from_status_id' => ['required', 'integer', Rule::exists('workflow_statuses', 'id')->where('issue_type_id', $issueType->id)],
            'to_status_id' => ['required', 'integer', Rule::exists('workflow_statuses', 'id')->where('issue_type_id', $issueType->id)],
        ]);

        $from = $issueType->statuses()->findOrFail($validated['from_status_id']);
        $to = $issueType->statuses()->findOrFail($validated['to_status_id']);

        $this->workflowService->createTransition($issueType, $from, $to);

        return redirect()->back()->with('success', 'The transition has been added.');
    }

    public function destroyTransition(Project $project, IssueType $issueType, WorkflowTransition $transition): RedirectResponse
    {
        $this->ensureIssueTypeBelongsToProject($project, $issueType);
        $this->ensureTransitionBelongsToType($issueType, $transition);
        $this->authorize('updateWorkflow', $project);

        $this->workflowService->deleteTransition($issueType, $transition);

        return redirect()->back()->with('success', 'The transition has been removed.');
    }

    private function ensureIssueTypeBelongsToProject(Project $project, IssueType $issueType): void
    {
        if ($issueType->project_id !== $project->id) {
            throw new NotFoundHttpException;
        }
    }

    private function ensureStatusBelongsToType(IssueType $issueType, WorkflowStatus $status): void
    {
        if ($status->issue_type_id !== $issueType->id) {
            throw new NotFoundHttpException;
        }
    }

    private function ensureTransitionBelongsToType(IssueType $issueType, WorkflowTransition $transition): void
    {
        if ($transition->issue_type_id !== $issueType->id) {
            throw new NotFoundHttpException;
        }
    }
}
