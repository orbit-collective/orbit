<?php

namespace App\Services\Automation\Actions;

use App\Enums\WorkflowStatusCategory;
use App\Models\Issue;
use App\Services\IssueService;
use App\Services\IssueTypeService;
use Illuminate\Support\Facades\Log;

/**
 * params: EITHER {workflow_status_id: int} - a specific status, chosen from
 * the project's workflow when the rule was configured - OR
 * {category: 'todo'|'in_progress'|'done'} - the issue's own issue type's
 * first status in that category (by sort_order), resolved fresh at
 * execution time. The category form is what makes a single rule (e.g. "PR
 * merged -> Done") portable across every issue type in a project, each with
 * its own distinct workflow and status ids - see AutomationDefaultsService,
 * the only place that seeds category-based rules today.
 *
 * Automation is a system action, not a user one, so it does not go through
 * WorkflowService::assertTransitionAllowed() (that graph constrains what a
 * human may pick from the current status) - it only confirms a
 * workflow_status_id genuinely belongs to this issue's own issue type, so a
 * rule can never move an issue into a status that doesn't exist for it.
 */
class ChangeStatusAction implements AutomationActionHandler
{
    public function __construct(
        protected IssueService $issueService,
        protected IssueTypeService $issueTypeService,
    ) {}

    public function handle(Issue $issue, array $params): void
    {
        if (! $issue->issueType) {
            return;
        }

        $newStatus = isset($params['workflow_status_id'])
            ? $this->resolveById($issue, $params['workflow_status_id'])
            : $this->resolveByCategory($issue, $params['category'] ?? null);

        if (! $newStatus) {
            return;
        }

        $this->issueService->updateIssue($issue, [
            'workflow_status_id' => $newStatus->id,
            'status' => $this->issueTypeService->legacyValueForWorkflowStatus($newStatus),
        ]);
    }

    private function resolveById(Issue $issue, mixed $workflowStatusId)
    {
        if (! $workflowStatusId) {
            return null;
        }

        $newStatus = $issue->issueType->statuses()->find($workflowStatusId);

        if (! $newStatus) {
            Log::warning('Automation change_status action skipped: target status does not belong to this issue type', [
                'issueId' => $issue->id,
                'workflowStatusId' => $workflowStatusId,
            ]);
        }

        return $newStatus;
    }

    private function resolveByCategory(Issue $issue, mixed $category)
    {
        if (! is_string($category) || WorkflowStatusCategory::tryFrom($category) === null) {
            return null;
        }

        return $issue->issueType->statuses()
            ->where('category', $category)
            ->orderBy('sort_order')
            ->first();
    }
}
