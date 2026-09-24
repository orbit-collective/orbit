<?php

namespace App\Services\Automation\Actions;

use App\Models\Issue;
use App\Services\IssueService;

/** params: {priority: 'low'|'medium'|'high'} */
class ChangePriorityAction implements AutomationActionHandler
{
    public function __construct(
        protected IssueService $issueService,
    ) {}

    public function handle(Issue $issue, array $params): void
    {
        $priority = $params['priority'] ?? null;

        if (! in_array($priority, ['low', 'medium', 'high'], true)) {
            return;
        }

        $this->issueService->updateIssue($issue, ['priority' => $priority]);
    }
}
