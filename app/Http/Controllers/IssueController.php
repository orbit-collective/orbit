<?php

namespace App\Http\Controllers;

use App\Enums\IssueStatus;
use App\Models\ExternalIssueLink;
use App\Models\Issue;
use App\Models\IssueType;
use App\Models\Label;
use App\Models\Project;
use App\Repositories\GithubRepositoryRepository;
use App\Repositories\ProjectIntegrationRepository;
use App\Services\Integrations\Github\GithubBranchService;
use App\Services\IssueService;
use App\Services\IssueTypeFieldService;
use App\Services\IssueTypeService;
use App\Services\LabelService;
use App\Services\ProjectService;
use App\Services\UserService;
use App\Services\WorkflowService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class IssueController extends Controller
{
    public function __construct(
        protected IssueService $issueService,
        protected UserService $userService,
        protected ProjectService $projectService,
        protected LabelService $labelService,
        protected IssueTypeService $issueTypeService,
        protected IssueTypeFieldService $issueTypeFieldService,
        protected WorkflowService $workflowService,
        protected ProjectIntegrationRepository $projectIntegrationRepository,
        protected GithubRepositoryRepository $githubRepositoryRepository,
        protected GithubBranchService $githubBranchService,
    ) {}

    public function show(Request $request, Project $project, Issue $issue): Response
    {
        if ($issue->project_id !== $project->id) {
            throw new NotFoundHttpException;
        }

        $this->authorize('view', $issue);

        $issueWithRelations = $this->issueService->getIssueWithRelations($issue->id);

        return Inertia::render('Issues/Show', [
            'project' => $project,
            'projects' => $this->projectService->getAllForUser($request->user()->id),
            'issue' => $issueWithRelations,
            'users' => $this->userService->getAssignableUsersForProject($project->id),
            'labels' => $this->mapLabels($this->labelService->getLabels($project)),
            'issueTypes' => $this->issueTypeService->getIssueTypes($project),
            'nextIssueId' => $this->issueService->peekNextIssueId(),
            'ancestors' => $this->issueService->ancestorsOf($issue)->values(),
            'linkedPullRequests' => $this->mapLinkedPullRequests($issueWithRelations->externalLinks),
            'githubRepositories' => $this->mapGithubRepositories($project),
            'githubDefaultBranchName' => $this->githubBranchService->defaultBranchName($issue),
        ]);
    }

    /**
     * @return array<int, array{id: int, owner: string, name: string}>
     */
    private function mapGithubRepositories(Project $project): array
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, 'github');

        if (! $projectIntegration || $projectIntegration->github_status !== 'connected') {
            return [];
        }

        return $this->githubRepositoryRepository->getForIntegration($projectIntegration)
            ->map(fn ($repository) => [
                'id' => $repository->repository_id,
                'owner' => $repository->owner,
                'name' => $repository->name,
            ])
            ->values()
            ->all();
    }

    private function mapLabels(Collection $labels): array
    {
        return $labels->map(fn (Label $label) => [
            'id' => $label->id,
            'name' => $label->name,
            'color' => $label->color,
            'description' => $label->description,
            'isSystem' => $label->is_system,
        ])->values()->all();
    }

    /**
     * @return array<int, array{provider: string, number: int, title: ?string, repositoryOwner: string, repositoryName: string, url: string, sourceBranch: ?string, targetBranch: ?string, status: ?string, draft: ?bool}>
     */
    private function mapLinkedPullRequests(Collection $externalLinks): array
    {
        return $externalLinks
            ->where('external_type', 'github_pull_request')
            ->map(function (ExternalIssueLink $link) {
                // external_key is always "owner/name#number" - see
                // GithubRelayEventProcessor, which is the only writer - but
                // parsed defensively in case a row was ever created outside
                // that path (a manual seeder, a future importer).
                [$repository, $number] = array_pad(explode('#', $link->external_key ?? ''), 2, '');
                [$owner, $name] = array_pad(explode('/', $repository), 2, '');

                return [
                    'provider' => 'github',
                    'number' => (int) $number,
                    'title' => $link->pull_request_title,
                    'repositoryOwner' => $owner,
                    'repositoryName' => $name,
                    'url' => $link->external_url,
                    'sourceBranch' => $link->source_branch,
                    'targetBranch' => $link->target_branch,
                    'status' => $link->status,
                    'draft' => $link->draft,
                ];
            })
            ->values()
            ->all();
    }

    public function update(Request $request, Issue $issue): RedirectResponse
    {
        $this->authorize('update', $issue);

        // Seeds the project's system labels/issue types if this is the first
        // time they're touched - otherwise the exists() rule below would
        // reject a stock label like "bug" on a project whose Settings tabs
        // nobody has opened yet, and the issue's issue_type_id/
        // workflow_status_id backfill wouldn't have run yet either.
        $this->labelService->ensureSystemLabels($issue->project);
        $this->issueTypeService->ensureSystemIssueTypes($issue->project);
        $issue->refresh();

        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|nullable|string',
            'status' => ['sometimes', 'required', Rule::enum(IssueStatus::class)],
            'priority' => 'sometimes|required|string',
            'issue_type_id' => 'sometimes|required|integer',
            'workflow_status_id' => 'sometimes|required|integer',
            'parent_id' => 'sometimes|nullable|integer',
            'assignee_id' => [
                'sometimes',
                'nullable',
                'exists:users,id',
                Rule::exists('project_user', 'user_id')->where('project_id', $issue->project_id),
            ],
            'labels' => 'sometimes|nullable|array',
            'labels.*' => [
                'string',
                Rule::exists('labels', 'name')->where('project_id', $issue->project_id),
            ],
            'custom_fields' => 'sometimes|nullable|array',
            'start_date' => 'sometimes|nullable|date',
            'end_date' => 'sometimes|nullable|date|after_or_equal:start_date',
        ]);

        if (array_key_exists('assignee_id', $data)) {
            $this->authorize('assign', $issue);
        }
        if (array_key_exists('priority', $data)) {
            $this->authorize('changePriority', $issue);
        }
        if (array_key_exists('labels', $data)) {
            $this->authorize('changeLabels', $issue);
        }

        $issueType = $issue->issueType;

        // Captured before the type-change block below, which may derive a
        // workflow_status_id of its own - only a status the caller actually
        // asked for should be transition-checked.
        $picksWorkflowStatus = array_key_exists('workflow_status_id', $data);

        if (array_key_exists('issue_type_id', $data)) {
            $newType = IssueType::query()->where('project_id', $issue->project_id)->find($data['issue_type_id']);

            if ($newType) {
                $this->authorize('createOfType', [Issue::class, $issue->project, $newType]);
                $issueType = $newType;

                // The old workflow_status_id almost certainly doesn't belong
                // to the new type's workflow - reset to its initial status
                // unless this same request also picks an explicit one below.
                if (! array_key_exists('status', $data) && ! $picksWorkflowStatus) {
                    $data['workflow_status_id'] = $newType->statuses()->where('is_initial', true)->first()?->id;
                }

                // Retyping an issue nobody has written up yet should hand it
                // the new type's starting point; an issue with a description
                // keeps whatever is already written.
                $template = $this->issueTypeService->defaultTemplateFor($newType);

                if ($template && ! array_key_exists('description', $data) && blank($issue->description)) {
                    $data['description'] = $template->description;
                }

                if ($template && ! array_key_exists('labels', $data) && empty($issue->labels)) {
                    $data['labels'] = $this->labelService->filterToExisting($issue->project, $template->default_labels ?? []);
                }
            } else {
                unset($data['issue_type_id']);
            }
        }

        // A picked workflow status wins over the legacy enum: the sidebar
        // sends workflow_status_id so a custom status ("In Review") is
        // selectable at all, and the old status column is derived from it.
        if ($picksWorkflowStatus) {
            $this->authorize('changeStatus', $issue);

            $newStatus = $issueType?->statuses()->find($data['workflow_status_id']);

            if (! $newStatus) {
                throw ValidationException::withMessages([
                    'workflow_status_id' => 'That status does not belong to this issue type\'s workflow.',
                ]);
            }

            // Moving to a different type means a different workflow, so the
            // old status isn't a node in it and no transition could exist.
            if ($issueType->id === $issue->issue_type_id) {
                $this->workflowService->assertTransitionAllowed($issueType, $issue->workflow_status_id, $newStatus->id);
            }

            $data['status'] = $this->issueTypeService->legacyValueForWorkflowStatus($newStatus);
        } elseif (array_key_exists('status', $data)) {
            $this->authorize('changeStatus', $issue);

            $newStatus = $issueType
                ? $this->issueTypeService->resolveWorkflowStatusForLegacyValue($issueType, $data['status'])
                : null;

            if ($newStatus && $issueType) {
                $this->workflowService->assertTransitionAllowed($issueType, $issue->workflow_status_id, $newStatus->id);
                $data['workflow_status_id'] = $newStatus->id;
            }
        }

        if ($issueType && array_key_exists('custom_fields', $data)) {
            // Merged onto what the issue already holds so a partial save from
            // the sidebar never wipes the fields it didn't send.
            // array_replace, not array_merge: these keys are numeric field
            // ids, and array_merge would renumber them.
            $merged = array_replace($issue->custom_fields ?? [], $data['custom_fields'] ?? []);
            $data['custom_fields'] = $this->issueTypeFieldService->sanitizeValues($issueType, $merged);
            $this->issueTypeFieldService->assertRequiredFieldsSatisfied($issueType, $data['custom_fields']);
        }

        if ($issueType) {
            $this->issueTypeService->assertRequiredFieldsSatisfied($issueType, $data, isCreate: false);
        }

        if (array_key_exists('parent_id', $data)) {
            $this->issueService->assertValidParent($issue->project, $data['parent_id'], $issueType?->id, $issue->id);
        }

        $before = $this->issueService->snapshot($issue);

        $this->issueService->updateIssue($issue, $data);

        $changesSummary = $this->issueService->summarizeChanges($issue, $before);
        $message = $changesSummary
            ? "Issue #$issue->id \"$issue->title\" updated: $changesSummary."
            : "Issue #$issue->id \"$issue->title\" saved — no changes detected.";

        return redirect()->back()
            ->with('success', $message)
            ->with('action_url', route('projects.show', $issue->project_id).'?issue='.$issue->id);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'project_id' => 'required|exists:projects,id',
            'priority' => 'required|string',
            'status' => ['required', Rule::enum(IssueStatus::class)],
            'issue_type_id' => 'nullable|integer',
            'template_id' => 'nullable|integer',
            'parent_id' => 'nullable|integer',
            'assignee_id' => [
                'nullable',
                'exists:users,id',
                Rule::exists('project_user', 'user_id')->where('project_id', $request->input('project_id')),
            ],
            'labels' => 'nullable|array',
            'custom_fields' => 'nullable|array',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $project = $this->projectService->findById($data['project_id']);

        $this->authorize('create', [Issue::class, $project]);

        // Seeding (a write) and the labels.* existence check both have to
        // come after authorization above - otherwise an unauthorized request
        // could still seed a project's system labels, or get a validation
        // error that leaks which label names exist in a project it can't
        // access.
        $this->labelService->ensureSystemLabels($project);
        $this->issueTypeService->ensureSystemIssueTypes($project);

        $request->validate([
            'labels.*' => [
                'string',
                Rule::exists('labels', 'name')->where('project_id', $project->id),
            ],
        ]);

        $issueType = IssueType::query()->where('project_id', $project->id)->find($data['issue_type_id'] ?? null)
            ?? $this->issueTypeService->defaultIssueType($project);

        $this->authorize('createOfType', [Issue::class, $project, $issueType]);

        $this->issueService->assertValidParent($project, $data['parent_id'] ?? null, $issueType->id);

        $data['issue_type_id'] = $issueType->id;
        $data['workflow_status_id'] = $this->issueTypeService
            ->resolveWorkflowStatusForLegacyValue($issueType, $data['status'])?->id;

        // With no explicit template_id the type's own template still applies:
        // that is the whole point of a per-type template, and quick-add (which
        // only ever sends a title) would otherwise never see one.
        $template = ! empty($data['template_id'])
            ? $issueType->templates()->find($data['template_id'])
            : $this->issueTypeService->defaultTemplateFor($issueType);

        if ($template) {
            $data['description'] = ($data['description'] ?? null) ?: $template->description;
            $data['labels'] = ! empty($data['labels'])
                ? $data['labels']
                : $this->labelService->filterToExisting($project, $template->default_labels ?? []);
        }
        unset($data['template_id']);

        $data['custom_fields'] = $this->issueTypeFieldService->sanitizeValues($issueType, $data['custom_fields'] ?? []);
        $this->issueTypeFieldService->assertRequiredFieldsSatisfied($issueType, $data['custom_fields']);

        $this->issueTypeService->assertRequiredFieldsSatisfied($issueType, $data, isCreate: true);

        $issue = $this->issueService->createIssue($data);

        return redirect()->back()
            ->with('success', "Issue #$issue->id \"$issue->title\" has been created successfully.")
            ->with('action_url', route('projects.show', $issue->project_id).'?issue='.$issue->id);
    }

    public function destroy(Issue $issue): RedirectResponse
    {
        $this->authorize('delete', $issue);

        $this->issueService->deleteIssue($issue);

        return redirect()->back()
            ->with('success', "Issue #$issue->id \"$issue->title\" has been deleted successfully.");
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['required', 'integer', 'exists:issues,id'],
        ]);

        foreach (Issue::whereIn('id', $validated['ids'])->get() as $issue) {
            $this->authorize('delete', $issue);
        }

        $this->issueService->bulkDeleteIssues($validated['ids']);

        return redirect()->back()
            ->with('success', 'Selected issues have been deleted successfully.');
    }
}
