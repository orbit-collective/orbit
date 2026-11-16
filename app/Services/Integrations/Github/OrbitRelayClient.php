<?php

namespace App\Services\Integrations\Github;

use App\DataTransferObjects\Github\GithubCommentResultDTO;
use App\DataTransferObjects\Github\GithubConnectionDTO;
use App\DataTransferObjects\Github\GithubCreatedBranchDTO;
use App\DataTransferObjects\Github\GithubCreatedPullRequestDTO;
use App\DataTransferObjects\Github\GithubIdentityDTO;
use App\DataTransferObjects\Github\GithubRelayEventDTO;
use App\DataTransferObjects\Github\GithubRepositoryDTO;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin wrapper around the orbit-api GitHub relay (see documentation/en/
 * integrations for the architecture). Never logs the relay token or a raw
 * response body, only the request path and response status, mirroring
 * JiraApiClient's secret-redaction convention. Writes (create/ack/comment/
 * rotate/revoke) are never automatically retried; only read-only polling
 * (getConnection/listEvents) is safe to retry from a scheduled job by simply
 * running again on the next tick.
 */
class OrbitRelayClient
{
    /**
     * The fixed page size orbit-api's GET /v1/github/events returns (it does
     * not paginate beyond this). A pending-event count that equals this
     * exact number cannot be presented as an exact total - see
     * GithubIntegrationService::getConnectStatus()'s pendingEventCountCapped.
     */
    public const int EVENTS_PAGE_LIMIT = 50;

    /**
     * @return array{connection: GithubConnectionDTO, token: string, installUrl: string}
     */
    public function createConnection(): array
    {
        $data = $this->request(
            fn () => $this->client()->post('/v1/github/connections'),
            'POST /v1/github/connections',
        );

        return [
            'connection' => GithubConnectionDTO::fromResponse($data['connection']),
            'token' => $data['token'],
            'installUrl' => $data['installUrl'],
        ];
    }

    public function getConnection(string $relayToken): GithubConnectionDTO
    {
        $data = $this->request(
            fn () => $this->authenticatedClient($relayToken)->get('/v1/github/connections/me'),
            'GET /v1/github/connections/me',
        );

        return GithubConnectionDTO::fromResponse($data);
    }

    /**
     * @return GithubRelayEventDTO[]
     */
    public function listEvents(string $relayToken): array
    {
        $data = $this->request(
            fn () => $this->authenticatedClient($relayToken)->get('/v1/github/events'),
            'GET /v1/github/events',
        );

        return array_map(
            fn (array $event) => GithubRelayEventDTO::fromResponse($event),
            $data['events'],
        );
    }

    public function ackEvent(string $relayToken, string $eventId): void
    {
        $this->request(
            fn () => $this->authenticatedClient($relayToken)->post("/v1/github/events/$eventId/ack"),
            'POST /v1/github/events/:eventId/ack',
        );
    }

    public function createComment(string $relayToken, string $eventId, int $pullRequestNumber, string $body): GithubCommentResultDTO
    {
        $data = $this->request(
            fn () => $this->authenticatedClient($relayToken)->post('/v1/github/comments', [
                'eventId' => $eventId,
                'pullRequestNumber' => $pullRequestNumber,
                'body' => $body,
            ]),
            'POST /v1/github/comments',
        );

        return GithubCommentResultDTO::fromResponse($data);
    }

    public function rotateToken(string $relayToken): string
    {
        $data = $this->request(
            fn () => $this->authenticatedClient($relayToken)->post('/v1/github/connections/token/rotate'),
            'POST /v1/github/connections/token/rotate',
        );

        return $data['token'];
    }

    public function revoke(string $relayToken): void
    {
        $this->request(
            fn () => $this->authenticatedClient($relayToken)->post('/v1/github/connections/revoke'),
            'POST /v1/github/connections/revoke',
        );
    }

    /**
     * @return GithubRepositoryDTO[]
     */
    public function listRepositories(string $relayToken): array
    {
        $data = $this->request(
            fn () => $this->authenticatedClient($relayToken)->get('/v1/github/repositories'),
            'GET /v1/github/repositories',
        );

        return array_map(
            fn (array $repository) => GithubRepositoryDTO::fromResponse($repository),
            $data['repositories'],
        );
    }

    /**
     * @return GithubRepositoryDTO[] the installation's own repositories not
     *                                 yet connected to this project.
     */
    public function listAvailableRepositories(string $relayToken): array
    {
        $data = $this->request(
            fn () => $this->authenticatedClient($relayToken)->get('/v1/github/repositories'),
            'GET /v1/github/repositories',
        );

        return array_map(
            fn (array $repository) => GithubRepositoryDTO::fromResponse($repository),
            $data['available'] ?? [],
        );
    }

    public function addRepository(string $relayToken, int $repositoryId): GithubRepositoryDTO
    {
        $data = $this->request(
            fn () => $this->authenticatedClient($relayToken)->post('/v1/github/repositories', [
                'repositoryId' => $repositoryId,
            ]),
            'POST /v1/github/repositories',
        );

        return GithubRepositoryDTO::fromResponse($data);
    }

    public function createBranch(string $relayToken, int $repositoryId, string $name, ?string $baseBranch = null): GithubCreatedBranchDTO
    {
        $data = $this->request(
            fn () => $this->authenticatedClient($relayToken)->post('/v1/github/branches', array_filter([
                'repositoryId' => $repositoryId,
                'name' => $name,
                'baseBranch' => $baseBranch,
            ], fn ($value) => $value !== null)),
            'POST /v1/github/branches',
        );

        return GithubCreatedBranchDTO::fromResponse($data);
    }

    public function createPullRequest(string $relayToken, int $repositoryId, string $title, string $head, string $base, string $body): GithubCreatedPullRequestDTO
    {
        $data = $this->request(
            fn () => $this->authenticatedClient($relayToken)->post('/v1/github/pull-requests', [
                'repositoryId' => $repositoryId,
                'title' => $title,
                'head' => $head,
                'base' => $base,
                'body' => $body,
            ]),
            'POST /v1/github/pull-requests',
        );

        return GithubCreatedPullRequestDTO::fromResponse($data);
    }

    /**
     * @return string|null the repository's own pull request template
     *                       content, or null if it has none.
     */
    public function getPullRequestTemplate(string $relayToken, int $repositoryId): ?string
    {
        $data = $this->request(
            fn () => $this->authenticatedClient($relayToken)->get('/v1/github/pull-request-template', [
                'repositoryId' => $repositoryId,
            ]),
            'GET /v1/github/pull-request-template',
        );

        return $data['template'] ?? null;
    }

    /**
     * Redeems a one-time exchange_token from orbit-api's centralized GitHub
     * sign-in broker for the identity it carries (see
     * documentation/en/authentication) - deliberately unauthenticated, since
     * the caller has no relay token yet at this point in the login flow;
     * possession of the (short-lived, single-use) token is itself the
     * authorization.
     */
    public function resolveGithubLoginToken(string $exchangeToken): GithubIdentityDTO
    {
        $data = $this->request(
            fn () => $this->client()->post('/v1/auth/github/resolve', [
                'exchange_token' => $exchangeToken,
            ]),
            'POST /v1/auth/github/resolve',
        );

        return GithubIdentityDTO::fromResponse($data);
    }

    /**
     * The Development view's read models. orbit-api already shapes these
     * (see its docs/api/github.md), so they stay plain arrays here.
     *
     * One page of pull requests, newest update first. `$since` (an ISO date)
     * keeps only what was updated since then and `hasMore` says whether the
     * next page can still hold more inside that range. CI is left out unless
     * asked for: it is two GitHub calls per open pull request.
     *
     * @return array{pullRequests: list<array<string, mixed>>, hasMore: bool}
     */
    public function listPullRequests(string $relayToken, int $repositoryId, string $state, int $page, int $perPage, ?string $since = null, bool $withCi = true): array
    {
        $data = $this->request(
            fn () => $this->authenticatedClient($relayToken)->get('/v1/github/pull-requests', array_filter([
                'repositoryId' => $repositoryId,
                'state' => $state,
                'page' => $page,
                'perPage' => $perPage,
                'since' => $since,
                'ci' => $withCi ? null : 'none',
            ], fn ($value) => $value !== null)),
            'GET /v1/github/pull-requests',
        );

        return [
            'pullRequests' => $data['pullRequests'],
            // An orbit-api that does not report it: a full page may have a next one.
            'hasMore' => $data['hasMore'] ?? count($data['pullRequests']) === $perPage,
        ];
    }

    /** @return array<string, mixed> */
    public function getPullRequest(string $relayToken, int $repositoryId, int $number): array
    {
        return $this->request(
            fn () => $this->authenticatedClient($relayToken)->get('/v1/github/pull-requests', [
                'repositoryId' => $repositoryId,
                'number' => $number,
            ]),
            'GET /v1/github/pull-requests',
        );
    }

    /**
     * @param  array{state?: string, title?: string, body?: string}  $changes
     * @return array<string, mixed>
     */
    public function updatePullRequest(string $relayToken, int $repositoryId, int $number, array $changes): array
    {
        return $this->request(
            fn () => $this->authenticatedClient($relayToken)->post('/v1/github/pull-request-update', [
                'repositoryId' => $repositoryId,
                'number' => $number,
                ...$changes,
            ]),
            'POST /v1/github/pull-request-update',
        );
    }

    /** @return list<array<string, mixed>> */
    public function listCommits(string $relayToken, int $repositoryId, ?string $branch, int $page, int $perPage): array
    {
        $data = $this->request(
            fn () => $this->authenticatedClient($relayToken)->get('/v1/github/commits', array_filter([
                'repositoryId' => $repositoryId,
                'branch' => $branch,
                'page' => $page,
                'perPage' => $perPage,
            ], fn ($value) => $value !== null)),
            'GET /v1/github/commits',
        );

        return $data['commits'];
    }

    /**
     * One page of branches, default first, with the repository's real total
     * (orbit-api reads every page of GitHub's list). An older orbit-api
     * answers without a total; the page's own count stands in for it.
     *
     * @return array{branches: list<array<string, mixed>>, total: int, page: int, perPage: int}
     */
    public function listBranches(string $relayToken, int $repositoryId, int $page = 1, int $perPage = 10): array
    {
        $data = $this->request(
            fn () => $this->authenticatedClient($relayToken)->get('/v1/github/branches', [
                'repositoryId' => $repositoryId,
                'page' => $page,
                'perPage' => $perPage,
            ]),
            'GET /v1/github/branches',
        );

        return [
            'branches' => $data['branches'],
            'total' => $data['total'] ?? count($data['branches']),
            'page' => $data['page'] ?? $page,
            'perPage' => $data['perPage'] ?? $perPage,
        ];
    }

    /** @return array<string, mixed> */
    public function getChecks(string $relayToken, int $repositoryId, string $ref): array
    {
        return $this->request(
            fn () => $this->authenticatedClient($relayToken)->get('/v1/github/checks', [
                'repositoryId' => $repositoryId,
                'ref' => $ref,
            ]),
            'GET /v1/github/checks',
        );
    }

    /**
     * The CI of several commits in one call (at most 20), by ref; a ref whose
     * lookup failed is null.
     *
     * @param  list<string>  $refs
     * @return array<string, array<string, mixed>|null>
     */
    public function getChecksBatch(string $relayToken, int $repositoryId, array $refs): array
    {
        $data = $this->request(
            fn () => $this->authenticatedClient($relayToken)->get('/v1/github/checks', [
                'repositoryId' => $repositoryId,
                'refs' => implode(',', $refs),
            ]),
            'GET /v1/github/checks',
        );

        return $data['checks'];
    }

    /** @return array<string, mixed> */
    public function getInsights(string $relayToken, int $repositoryId): array
    {
        return $this->request(
            fn () => $this->authenticatedClient($relayToken)->get('/v1/github/insights', ['repositoryId' => $repositoryId]),
            'GET /v1/github/insights',
        );
    }

    public function removeRepository(string $relayToken, int $repositoryId): void
    {
        $this->request(
            fn () => $this->authenticatedClient($relayToken)->delete("/v1/github/repositories/$repositoryId"),
            'DELETE /v1/github/repositories/:repositoryId',
        );
    }

    /**
     * @throws OrbitRelayApiException on a connection failure or a non-2xx/
     *                                 non-success response
     */
    private function request(callable $call, string $path): array
    {
        try {
            $response = $call();
        } catch (ConnectionException $exception) {
            $isTimeout = $this->isTimeout($exception);

            // The transport error carries the real cause (DNS, refused, timed
            // out) and only ever the request URL - never the bearer token,
            // which is sent as a header.
            Log::warning(
                $isTimeout
                    ? 'Orbit relay API request timed out'
                    : 'Orbit relay API request failed to connect',
                ['path' => $path, 'reason' => $exception->getMessage()],
            );

            throw new OrbitRelayApiException(
                $isTimeout
                    ? "Orbit relay API request timed out: $path"
                    : "Orbit relay API request failed to connect: $path",
                previous: $exception,
                isTimeout: $isTimeout,
            );
        }

        $body = $response->json() ?? [];

        if ($response->failed() || ($body['success'] ?? false) !== true) {
            $code = $body['error']['code'] ?? null;
            $message = $body['error']['message'] ?? 'Orbit relay API request failed.';

            Log::warning('Orbit relay API request failed', [
                'path' => $path,
                'status' => $response->status(),
                'code' => $code,
            ]);

            throw new OrbitRelayApiException($message, $code);
        }

        return $body['data'];
    }

    /**
     * cURL reports both a request that was not answered in time and a connect
     * timeout as error 28 ("Operation timed out"). The message check is a
     * fallback for transports that word it differently; either way the relay
     * did not respond in time.
     */
    private function isTimeout(ConnectionException $exception): bool
    {
        return str_contains($exception->getMessage(), 'cURL error 28')
            || stripos($exception->getMessage(), 'timed out') !== false;
    }

    private function client(): PendingRequest
    {
        return Http::baseUrl(rtrim(config('services.orbit_api.url'), '/'))
            ->acceptJson()
            ->timeout(10);
    }

    private function authenticatedClient(string $relayToken): PendingRequest
    {
        return $this->client()->withToken($relayToken);
    }
}
