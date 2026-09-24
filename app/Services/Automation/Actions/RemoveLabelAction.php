<?php

namespace App\Services\Automation\Actions;

use App\Models\Issue;
use App\Services\IssueService;

/** params: {label: string} */
class RemoveLabelAction implements AutomationActionHandler
{
    public function __construct(
        protected IssueService $issueService,
    ) {}

    public function handle(Issue $issue, array $params): void
    {
        $name = $params['label'] ?? null;
        $labels = $issue->labels ?? [];

        if (! $name || ! in_array($name, $labels, true)) {
            return;
        }

        $this->issueService->updateIssue($issue, [
            'labels' => array_values(array_diff($labels, [$name])),
        ]);
    }
}
