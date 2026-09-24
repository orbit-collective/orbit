<?php

namespace App\Services\Automation\Actions;

use App\Models\Issue;
use App\Services\IssueService;
use App\Services\IssueTypeService;
use Illuminate\Support\Facades\Log;

/**
 * params: {workflow_status_id: int} - the target status, chosen from the
 * project's workflow when the rule was configured. Automation is a system
 * action, not a user one, so it does not go through
 * WorkflowService::assertTransitionAllowed() (that graph constrains what a
 * human may pick from the current status) - it only confirms the target
 * status genuinely belongs to this issue's own issue type, so a rule can
 * never move an issue into a status that doesn't exist for it.
 */
class ChangeStatusAction implements AutomationActionHandler
{
    public function __construct(
        protected IssueService $issueService,
        protected IssueTypeService $issueTypeService,
    ) {}

    public function handle(Issue $issue, array $params): void
    {
        $workflowStatusId = $params['workflow_status_id'] ?? null;

        if (! $workflowStatusId || ! $issue->issueType) {
            return;
        }

        $newStatus = $issue->issueType->statuses()->find($workflowStatusId);

        if (! $newStatus) {
            Log::warning('Automation change_status action skipped: target status does not belong to this issue type', [
                'issueId' => $issue->id,
                'workflowStatusId' => $workflowStatusId,
            ]);

            return;
        }

        $this->issueService->updateIssue($issue, [
            'workflow_status_id' => $newStatus->id,
            'status' => $this->issueTypeService->legacyValueForWorkflowStatus($newStatus),
        ]);
    }
}
