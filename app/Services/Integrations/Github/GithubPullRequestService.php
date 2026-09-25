<?php

namespace App\Services\Integrations\Github;

use App\DataTransferObjects\Github\GithubCreatedPullRequestDTO;
use App\Models\Issue;
use App\Models\Project;
use App\Repositories\ProjectIntegrationRepository;
use Illuminate\Validation\ValidationException;

/**
 * Always appends the canonical `<!-- orbit-issue:ID -->` marker to the
 * pull request body server-side - there is no bypass path, matching the
 * same contract GithubMarkerParser already parses on the way back in via
 * the `opened` webhook, which is the sole writer of the resulting link
 * (see GithubRelayEventProcessor - nothing here creates that link itself).
 */
class GithubPullRequestService
{
    private const array ERROR_MESSAGES = [
        'GITHUB_REPOSITORY_NOT_ALLOWED' => 'That repository is not connected to this project.',
        'CONNECTION_NOT_CONNECTED' => 'GitHub is not connected for this project.',
    ];

    public function __construct(
        protected ProjectIntegrationRepository $projectIntegrationRepository,
        protected OrbitRelayClient $relayClient,
    ) {}

    /**
     * @throws ValidationException if nothing is connected or orbit-api rejects the request
     */
    public function create(Project $project, Issue $issue, int $repositoryId, string $title, string $head, string $base, string $body = ''): GithubCreatedPullRequestDTO
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, 'github');
        $relayToken = $projectIntegration?->resolveGithubRelayToken();

        if (! $projectIntegration || ! $relayToken || $projectIntegration->github_status !== 'connected') {
            throw ValidationException::withMessages([
                'pullRequest' => 'GitHub is not connected for this project.',
            ]);
        }

        $bodyWithMarker = trim($body)."\n\n<!-- orbit-issue:{$issue->id} -->";

        try {
            return $this->relayClient->createPullRequest($relayToken, $repositoryId, $title, $head, $base, $bodyWithMarker);
        } catch (OrbitRelayApiException $exception) {
            throw ValidationException::withMessages([
                'pullRequest' => self::ERROR_MESSAGES[$exception->errorCode] ?? 'Failed to create the pull request.',
            ]);
        }
    }
}
