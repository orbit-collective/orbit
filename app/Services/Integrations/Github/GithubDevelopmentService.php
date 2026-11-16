<?php

namespace App\Services\Integrations\Github;

use App\Models\ExternalIssueLink;
use App\Models\GithubRepository;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Repositories\ExternalIssueLinkRepository;
use App\Repositories\GithubRepositoryRepository;
use App\Repositories\IssueRepository;
use App\Repositories\ProjectIntegrationRepository;
use App\Services\ActivityLogService;
use App\Support\Cache\CacheVersion;
use Illuminate\Validation\ValidationException;

/**
 * Backs the project's Development view: everything it reads from GitHub
 * through orbit-api (pull requests, commits, branches, CI, statistics) and
 * the few things it writes (close/reopen a pull request, link or unlink an
 * Orbit issue). A repository is only ever reachable when it is one of the
 * project's own connected repositories, and a read model never leaves this
 * class without the Orbit issues linked to each pull request.
 *
 * Reads are cached briefly as plain arrays under the project's development
 * cache scope; every write bumps it.
 */
class GithubDevelopmentService
{
    private const int CACHE_TTL_SECONDS = 30;

    private const array ERROR_MESSAGES = [
        'GITHUB_REPOSITORY_NOT_ALLOWED' => 'That repository is not connected to this project.',
        'CONNECTION_NOT_CONNECTED' => 'GitHub is not connected for this project.',
    ];

    public function __construct(
        protected ProjectIntegrationRepository $projectIntegrationRepository,
        protected GithubRepositoryRepository $githubRepositoryRepository,
        protected ExternalIssueLinkRepository $externalIssueLinkRepository,
        protected OrbitRelayClient $relayClient,
        protected GithubMarkerParser $markerParser,
        protected GithubIssueResolver $issueResolver,
        protected ActivityLogService $activityLogService,
        protected IssueRepository $issueRepository,
    ) {}

    /**
     * What the page itself needs, without a single GitHub call: whether
     * GitHub is connected and which repositories the view can show.
     *
     * @return array{connected: bool, repositories: list<array{id: int, owner: string, name: string}>}
     */
    public function overview(Project $project): array
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, 'github');

        if (! $projectIntegration || $projectIntegration->github_status !== 'connected') {
            return ['connected' => false, 'repositories' => []];
        }

        return [
            'connected' => true,
            'repositories' => $this->githubRepositoryRepository->getForIntegration($projectIntegration)
                ->map(fn (GithubRepository $repository) => [
                    'id' => $repository->repository_id,
                    'owner' => $repository->owner,
                    'name' => $repository->name,
                ])
                ->values()
                ->all(),
        ];
    }

    /** @return list<array<string, mixed>> */
    public function pullRequests(Project $project, int $repositoryId, string $state, int $page, int $perPage): array
    {
        [$projectIntegration, $token, $repository] = $this->context($project, $repositoryId);

        $pullRequests = $this->remember($project, "pulls:$repositoryId:$state:$page:$perPage", fn () => $this->relayClient->listPullRequests($token, $repositoryId, $state, $page, $perPage));

        return $this->withLinkedIssues($projectIntegration, $repository, $pullRequests);
    }

    /** @return array<string, mixed> */
    public function pullRequest(Project $project, int $repositoryId, int $number): array
    {
        [$projectIntegration, $token, $repository] = $this->context($project, $repositoryId);

        $pullRequest = $this->call(fn () => $this->relayClient->getPullRequest($token, $repositoryId, $number));

        return $this->withLinkedIssues($projectIntegration, $repository, [$pullRequest])[0];
    }

    /** @return list<array<string, mixed>> */
    public function commits(Project $project, int $repositoryId, ?string $branch, int $page, int $perPage): array
    {
        [, $token] = $this->context($project, $repositoryId);

        return $this->remember($project, "commits:$repositoryId:$branch:$page:$perPage", fn () => $this->relayClient->listCommits($token, $repositoryId, $branch, $page, $perPage));
    }

    /** @return array{branches: list<array<string, mixed>>, total: int, page: int, perPage: int} */
    public function branches(Project $project, int $repositoryId, int $page, int $perPage): array
    {
        [, $token] = $this->context($project, $repositoryId);

        return $this->remember($project, "branches:$repositoryId:$page:$perPage", fn () => $this->relayClient->listBranches($token, $repositoryId, $page, $perPage));
    }

    /** @return array<string, mixed> */
    public function checks(Project $project, int $repositoryId, string $ref): array
    {
        [, $token] = $this->context($project, $repositoryId);

        return $this->remember($project, "checks:$repositoryId:$ref", fn () => $this->relayClient->getChecks($token, $repositoryId, $ref));
    }

    /** @return array<string, mixed> */
    public function insights(Project $project, int $repositoryId): array
    {
        [, $token] = $this->context($project, $repositoryId);

        return $this->remember($project, "insights:$repositoryId", fn () => $this->relayClient->getInsights($token, $repositoryId));
    }

    /**
     * Closes or reopens a pull request on GitHub. The links keep their
     * status on purpose: the `closed`/`reopened` webhook is what updates
     * them (and fires the automations listening for it), and it would be
     * skipped as a duplicate if this had already advanced them.
     */
    public function setPullRequestState(Project $project, int $repositoryId, int $number, string $state): void
    {
        [, $token, $repository] = $this->context($project, $repositoryId);

        $this->call(fn () => $this->relayClient->updatePullRequest($token, $repositoryId, $number, ['state' => $state]));

        $this->activityLogService->log($project->id, ($state === 'closed' ? 'Closed' : 'Reopened')." pull request $repository->owner/$repository->name#$number");

        $this->forget($project);
    }

    /**
     * Links an issue to a pull request: the pull request's description gets
     * the issue's marker (so GitHub-side the link is as visible as one made
     * by hand) and the link row is written straight away, since no
     * `opened` event will come for a pull request that already exists.
     *
     * @throws ValidationException if the issue is not one of this project's
     */
    public function linkIssue(Project $project, int $repositoryId, int $number, int $issueId): void
    {
        [$projectIntegration, $token, $repository] = $this->context($project, $repositoryId);

        $issue = $this->resolveIssue($project, $issueId);

        $pullRequest = $this->call(fn () => $this->relayClient->getPullRequest($token, $repositoryId, $number));

        $body = $this->markerParser->withMarker($pullRequest['body'] ?? '', $issue->id);

        if ($body !== trim($pullRequest['body'] ?? '')) {
            $this->call(fn () => $this->relayClient->updatePullRequest($token, $repositoryId, $number, ['body' => $body]));
        }

        $this->externalIssueLinkRepository->upsertFor($projectIntegration, (string) $pullRequest['id'], [
            'issue_id' => $issue->id,
            'external_key' => $this->pullRequestKey($repository, $number),
            'external_url' => $pullRequest['url'],
            'external_type' => 'github_pull_request',
            'pull_request_title' => $pullRequest['title'],
            'source_branch' => $pullRequest['headBranch'],
            'target_branch' => $pullRequest['baseBranch'],
            'status' => $pullRequest['state'],
            'draft' => $pullRequest['draft'],
            'github_updated_at' => $pullRequest['updatedAt'],
            'merged_at' => $pullRequest['mergedAt'],
            'check_status' => $this->checkStatusOf($pullRequest),
            'review_status' => $this->reviewStatusOf($pullRequest),
            'last_synced_at' => now(),
        ]);

        $this->activityLogService->log($project->id, "Linked #$issue->number to pull request $repository->owner/$repository->name#$number");

        $this->forget($project);
    }

    /** Drops an issue's link to a pull request, marker included. */
    public function unlinkIssue(Project $project, int $repositoryId, int $number, int $issueId): void
    {
        [$projectIntegration, $token, $repository] = $this->context($project, $repositoryId);

        $issue = $this->resolveIssue($project, $issueId);

        $pullRequest = $this->call(fn () => $this->relayClient->getPullRequest($token, $repositoryId, $number));

        $body = $this->markerParser->withoutMarker($pullRequest['body'] ?? '', $issue->id);

        if ($body !== trim($pullRequest['body'] ?? '')) {
            $this->call(fn () => $this->relayClient->updatePullRequest($token, $repositoryId, $number, ['body' => $body]));
        }

        $link = $this->externalIssueLinkRepository->findFor($projectIntegration, (string) $pullRequest['id'], $issue->id);

        if ($link) {
            $this->externalIssueLinkRepository->delete($link);
        }

        $this->activityLogService->log($project->id, "Unlinked #$issue->number from pull request $repository->owner/$repository->name#$number");

        $this->forget($project);
    }

    /**
     * Issues of the project the picker offers for a pull request, minus the
     * ones it is already linked to is left to the caller (it knows them).
     *
     * @return list<array{id: int, number: int, title: string}>
     */
    public function searchIssues(Project $project, string $text): array
    {
        return $this->issueRepository->searchByTitleOrNumber($project->id, $text)
            ->map(fn (Issue $issue) => ['id' => $issue->id, 'number' => $issue->number, 'title' => $issue->title])
            ->values()
            ->all();
    }

    /** Drops what the view cached, e.g. after a branch was created. */
    public function forget(Project $project): void
    {
        CacheVersion::bump(CacheVersion::development($project->id));
    }

    /**
     * @return array{0: ProjectIntegration, 1: string, 2: GithubRepository}
     *
     * @throws ValidationException if GitHub is not connected or the repository is not the project's
     */
    private function context(Project $project, int $repositoryId): array
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, 'github');
        $relayToken = $projectIntegration?->resolveGithubRelayToken();

        if (! $projectIntegration || ! $relayToken || $projectIntegration->github_status !== 'connected') {
            throw ValidationException::withMessages(['development' => self::ERROR_MESSAGES['CONNECTION_NOT_CONNECTED']]);
        }

        $repository = $this->githubRepositoryRepository->findByRepositoryId($projectIntegration, $repositoryId);

        if (! $repository) {
            throw ValidationException::withMessages(['development' => self::ERROR_MESSAGES['GITHUB_REPOSITORY_NOT_ALLOWED']]);
        }

        return [$projectIntegration, $relayToken, $repository];
    }

    private function resolveIssue(Project $project, int $issueId): Issue
    {
        return $this->issueResolver->resolve($issueId, $project->id)
            ?? throw ValidationException::withMessages(['issue_id' => 'That issue does not belong to this project.']);
    }

    /**
     * Runs a relay call, turning a relay failure into a validation message
     * the browser can show: orbit-api's own message is already a clean,
     * safe string for every code but the generic and transport ones.
     *
     * @template T
     *
     * @param  callable(): T  $call
     * @return T
     */
    private function call(callable $call): mixed
    {
        try {
            return $call();
        } catch (OrbitRelayApiException $exception) {
            throw ValidationException::withMessages([
                'development' => self::ERROR_MESSAGES[$exception->errorCode]
                    ?? match (true) {
                        $exception->isTimeout => 'GitHub did not answer in time. Try again in a moment.',
                        $exception->errorCode === null, $exception->errorCode === 'GITHUB_API_ERROR' => 'GitHub could not be reached.',
                        default => $exception->getMessage(),
                    },
            ]);
        }
    }

    /**
     * @template T
     *
     * @param  callable(): T  $callback
     * @return T
     */
    private function remember(Project $project, string $key, callable $callback): mixed
    {
        return CacheVersion::remember(
            CacheVersion::development($project->id),
            "development:$project->id:$key",
            self::CACHE_TTL_SECONDS,
            fn () => $this->call($callback),
        );
    }

    /**
     * @param  list<array<string, mixed>>  $pullRequests
     * @return list<array<string, mixed>>
     */
    private function withLinkedIssues(ProjectIntegration $projectIntegration, GithubRepository $repository, array $pullRequests): array
    {
        $keys = array_map(fn (array $pullRequest) => $this->pullRequestKey($repository, $pullRequest['number']), $pullRequests);

        $links = $this->externalIssueLinkRepository
            ->getForPullRequestKeys($projectIntegration, $keys)
            ->groupBy('external_key');

        return array_map(function (array $pullRequest) use ($repository, $links) {
            $pullRequest['issues'] = ($links->get($this->pullRequestKey($repository, $pullRequest['number'])) ?? collect())
                ->filter(fn (ExternalIssueLink $link) => $link->issue !== null)
                ->map(fn (ExternalIssueLink $link) => [
                    'id' => $link->issue->id,
                    'number' => $link->issue->number,
                    'title' => $link->issue->title,
                ])
                ->values()
                ->all();

            return $pullRequest;
        }, $pullRequests);
    }

    private function pullRequestKey(GithubRepository $repository, int $number): string
    {
        return "$repository->owner/$repository->name#$number";
    }

    /** @param  array<string, mixed>  $pullRequest */
    private function checkStatusOf(array $pullRequest): ?string
    {
        $state = $pullRequest['ci']['state'] ?? null;

        return in_array($state, ['passed', 'failed', 'pending'], true) ? $state : null;
    }

    /** @param  array<string, mixed>  $pullRequest */
    private function reviewStatusOf(array $pullRequest): ?string
    {
        $state = $pullRequest['reviewState'] ?? null;

        return in_array($state, ['approved', 'changes_requested', 'commented'], true) ? $state : null;
    }
}
