<?php

namespace App\Services\Automation\Actions;

use App\Models\Issue;
use App\Services\IssueService;
use App\Services\PriorityService;

/** params: {priority: the name of one of the issue's project's priorities} */
class ChangePriorityAction implements AutomationActionHandler
{
    public function __construct(
        protected IssueService $issueService,
        protected PriorityService $priorityService,
    ) {}

    public function handle(Issue $issue, array $params): void
    {
        $name = $params['priority'] ?? null;

        if (! is_string($name)) {
            return;
        }

        $priority = $this->priorityService->findByName($issue->project, $name);

        if (! $priority) {
            return;
        }

        $this->issueService->updateIssue($issue, ['priority' => $priority->name]);
    }
}
