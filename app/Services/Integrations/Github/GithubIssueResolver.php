<?php

namespace App\Services\Integrations\Github;

use App\Models\Issue;
use App\Repositories\IssueRepository;

/**
 * Resolves a marker's issue id to an actual Orbit issue, scoped to the
 * project that owns the GitHub integration. A marker can never link an
 * issue belonging to a different project — resolve() returns null rather
 * than the issue in that case, same as a missing issue.
 */
class GithubIssueResolver
{
    public function __construct(
        protected IssueRepository $issueRepository,
    ) {}

    public function resolve(int $issueId, int $projectId): ?Issue
    {
        return $this->issueRepository->findForProject($issueId, $projectId);
    }
}
