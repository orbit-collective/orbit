<?php

namespace App\Services\Integrations\Github;

use App\DataTransferObjects\Github\GithubCreatedBranchDTO;
use App\Models\Issue;
use App\Models\Project;
use App\Repositories\ProjectIntegrationRepository;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Human-friendly messages for the orbit-api domain error codes a branch
 * creation can fail with - never lets a raw GitHub API response reach the
 * user (see BranchService on the orbit-api side, which is where these codes
 * are actually raised).
 */
class GithubBranchService
{
    private const array ERROR_MESSAGES = [
        'GITHUB_BRANCH_ALREADY_EXISTS' => 'A branch with that name already exists.',
        'GITHUB_REPOSITORY_NOT_ALLOWED' => 'That repository is not connected to this project.',
        'INVALID_BRANCH_NAME' => 'That is not a valid branch name.',
        'CONNECTION_NOT_CONNECTED' => 'GitHub is not connected for this project.',
    ];

    public function __construct(
        protected ProjectIntegrationRepository $projectIntegrationRepository,
        protected OrbitRelayClient $relayClient,
    ) {}

    /**
     * A default branch name derived from the issue - lowercase, slugified,
     * truncated to a safe length so it stays a valid, readable git ref.
     */
    public function defaultBranchName(Issue $issue): string
    {
        $slug = Str::slug($issue->title);

        return Str::limit("{$issue->id}-{$slug}", 60, '');
    }

    /**
     * @throws ValidationException if nothing is connected or orbit-api rejects the request
     */
    public function create(Project $project, Issue $issue, int $repositoryId, string $name, ?string $baseBranch = null): GithubCreatedBranchDTO
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, 'github');
        $relayToken = $projectIntegration?->resolveGithubRelayToken();

        if (! $projectIntegration || ! $relayToken || $projectIntegration->github_status !== 'connected') {
            throw ValidationException::withMessages([
                'branch' => 'GitHub is not connected for this project.',
            ]);
        }

        try {
            return $this->relayClient->createBranch($relayToken, $repositoryId, $name, $baseBranch);
        } catch (OrbitRelayApiException $exception) {
            throw ValidationException::withMessages([
                'branch' => self::ERROR_MESSAGES[$exception->errorCode] ?? 'Failed to create the branch.',
            ]);
        }
    }
}
