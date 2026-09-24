<?php

namespace App\Services\Automation\Actions;

use App\Models\Issue;
use App\Repositories\LabelRepository;
use App\Services\IssueService;

/** params: {label: string} - must be a real label of the issue's project. */
class AddLabelAction implements AutomationActionHandler
{
    public function __construct(
        protected IssueService $issueService,
        protected LabelRepository $labelRepository,
    ) {}

    public function handle(Issue $issue, array $params): void
    {
        $name = $params['label'] ?? null;

        if (! $name || ! $this->labelRepository->findForProject($issue->project, $name)) {
            return;
        }

        $labels = $issue->labels ?? [];

        if (in_array($name, $labels, true)) {
            return;
        }

        $this->issueService->updateIssue($issue, ['labels' => [...$labels, $name]]);
    }
}
