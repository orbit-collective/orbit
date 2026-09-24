<?php

namespace App\Services\Automation\Actions;

use App\Models\Issue;
use App\Repositories\ProjectMemberRepository;
use App\Services\IssueService;

/** params: {user_id: int} - must already be a member of the issue's project. */
class AssignUserAction implements AutomationActionHandler
{
    public function __construct(
        protected IssueService $issueService,
        protected ProjectMemberRepository $projectMemberRepository,
    ) {}

    public function handle(Issue $issue, array $params): void
    {
        $userId = $params['user_id'] ?? null;

        if (! $userId || ! $this->projectMemberRepository->isMember($issue->project, (int) $userId)) {
            return;
        }

        $this->issueService->updateIssue($issue, ['assignee_id' => $userId]);
    }
}
