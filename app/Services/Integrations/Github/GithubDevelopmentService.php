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
use Illuminate\Support\Facades\Log;
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
    /**
     * How long a read is reused, by how fast it changes: what people act on
     * (pull requests, CI) stays short, what barely moves (statistics,
     * branches) lives longer. Every write drops all of them.
     */
    private const int TTL_PULL_REQUESTS = 30;

    private const int TTL_CHECKS = 30;

    private const int TTL_ISSUES = 60;

    private const int TTL_COMMITS = 60;

    private const int TTL_BRANCHES = 120;

    private const int TTL_INSIGHTS = 600;

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
        protected GithubCommentFormatter $commentFormatter,
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

    /**
     * One page of the repository's pull requests with the issues linked to
     * each. `$since` bounds them by last update; `hasMore` says whether the
     * next page can still hold more inside that range. CI is never part of
     * it (see checksBatch()): the list must not wait for the slowest check.
     *
     * @return array{pullRequests: list<array<string, mixed>>, hasMore: bool}
     */
    public function pullRequests(Project $project, int $repositoryId, string $state, int $page, int $perPage, ?string $since = null): array
    {
        [$projectIntegration, $token, $repository] = $this->context($project, $repositoryId);

        $result = $this->remember($project, "pulls:$repositoryId:$state:$page:$perPage:$since", self::TTL_PULL_REQUESTS, fn () => $this->relayClient->listPullRequests($token, $repositoryId, $state, $page, $perPage, $since, withCi: false));

        return [
            'pullRequests' => $this->withLinkedIssues($projectIntegration, $repository, $result['pullRequests']),
            'hasMore' => $result['hasMore'],
        ];
    }

    /**
     * The CI of the commits a view is showing, one call for all of them.
     *
     * @param  list<string>  $refs
     * @return array<string, array<string, mixed>|null>
     */
    public function checksBatch(Project $project, int $repositoryId, array $refs): array
    {
        [, $token] = $this->context($project, $repositoryId);

        sort($refs);

        return $this->remember($project, "checks-batch:$repositoryId:".md5(implode(',', $refs)), self::TTL_CHECKS, fn () => $this->relayClient->getChecksBatch($token, $repositoryId, $refs));
    }

    /**
     * One page of the repository's GitHub issues, for starting a branch from
     * one. `$since` bounds them by last update like the pull requests.
     *
     * @return array{issues: list<array<string, mixed>>, hasMore: bool}
     */
    public function githubIssues(Project $project, int $repositoryId, string $state, int $page, int $perPage, ?string $since = null): array
    {
        [, $token] = $this->context($project, $repositoryId);

        return $this->remember($project, "gh-issues:$repositoryId:$state:$page:$perPage:$since", self::TTL_ISSUES, fn () => $this->relayClient->listIssues($token, $repositoryId, $state, $page, $perPage, $since));
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

        return $this->remember($project, "commits:$repositoryId:$branch:$page:$perPage", self::TTL_COMMITS, fn () => $this->relayClient->listCommits($token, $repositoryId, $branch, $page, $perPage));
    }

    /** @return array{branches: list<array<string, mixed>>, total: int, page: int, perPage: int} */
    public function branches(Project $project, int $repositoryId, int $page, int $perPage): array
    {
        [, $token] = $this->context($project, $repositoryId);

        return $this->remember($project, "branches:$repositoryId:$page:$perPage", self::TTL_BRANCHES, fn () => $this->relayClient->listBranches($token, $repositoryId, $page, $perPage));
    }

    /** @return array<string, mixed> */
    public function checks(Project $project, int $repositoryId, string $ref): array
    {
        [, $token] = $this->context($project, $repositoryId);

        return $this->remember($project, "checks:$repositoryId:$ref", self::TTL_CHECKS, fn () => $this->relayClient->getChecks($token, $repositoryId, $ref));
    }

    /** @return array<string, mixed> */
    public function insights(Project $project, int $repositoryId): array
    {
        [, $token] = $this->context($project, $repositoryId);

        return $this->remember($project, "insights:$repositoryId", self::TTL_INSIGHTS, fn () => $this->relayClient->getInsights($token, $repositoryId));
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

        $alreadyLinked = $this->externalIssueLinkRepository->findFor($projectIntegration, (string) $pullRequest['id'], $issue->id) !== null;

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

        // The same bot comment a pull request gets when it is opened with the
        // marker, so the link is as visible on GitHub as one made there. Only
        // for a new link (linking again says nothing new), and never fatal:
        // the link is made, the comment is a courtesy.
        if (! $alreadyLinked) {
            try {
                $this->relayClient->commentOnPullRequest($token, $repositoryId, $number, $this->commentFormatter->format([$issue], $project));
            } catch (OrbitRelayApiException $exception) {
                Log::warning('Could not comment on a pull request linked from the development view', [
                    'projectId' => $project->id,
                    'pullRequestNumber' => $number,
                    'code' => $exception->errorCode,
                ]);
            }
        }

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
    private function remember(Project $project, string $key, int $ttl, callable $callback): mixed
    {
        return CacheVersion::remember(
            CacheVersion::development($project->id),
            "development:$project->id:$key",
            $ttl,
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
