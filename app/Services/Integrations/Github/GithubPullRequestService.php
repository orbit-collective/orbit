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
 * When no body is given, the repository's own pull request template is
 * used instead of leaving the description blank (see
 * OrbitRelayClient::getPullRequestTemplate()) - falling back to an
 * explicit note when the repository has no template, rather than silently
 * shipping a description that's just the invisible marker.
 */
class GithubPullRequestService
{
    private const string NO_TEMPLATE_FOUND_NOTE = 'No pull request template found in this repository. This pull request was created by Orbit.';

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

        $resolvedBody = trim($body);

        if ($resolvedBody === '') {
            // A failure to fetch the template (transient orbit-api issue) is
            // never allowed to block creating the pull request itself - it
            // just falls back to the same note a genuinely missing template
            // gets.
            try {
                $resolvedBody = $this->relayClient->getPullRequestTemplate($relayToken, $repositoryId) ?? self::NO_TEMPLATE_FOUND_NOTE;
            } catch (OrbitRelayApiException) {
                $resolvedBody = self::NO_TEMPLATE_FOUND_NOTE;
            }
        }

        $bodyWithMarker = trim($resolvedBody)."\n\n<!-- orbit-issue:{$issue->id} -->";

        try {
            return $this->relayClient->createPullRequest($relayToken, $repositoryId, $title, $head, $base, $bodyWithMarker);
        } catch (OrbitRelayApiException $exception) {
            // For most codes, orbit-api's own message is already a clean,
            // safe, specific string (a fixed message, or GitHub's own public
            // validation message forwarded via GITHUB_PULL_REQUEST_REJECTED)
            // - only the generic transport-level fallback still needs a
            // friendlier override.
            throw ValidationException::withMessages([
                'pullRequest' => self::ERROR_MESSAGES[$exception->errorCode]
                    ?? ($exception->errorCode === 'GITHUB_API_ERROR' ? 'Failed to create the pull request.' : $exception->getMessage()),
            ]);
        }
    }
}
