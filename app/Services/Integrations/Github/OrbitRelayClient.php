<?php

namespace App\Services\Integrations\Github;

use App\DataTransferObjects\Github\GithubCommentResultDTO;
use App\DataTransferObjects\Github\GithubConnectionDTO;
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
            Log::warning('Orbit relay API request failed to connect', ['path' => $path]);

            throw new OrbitRelayApiException("Orbit relay API request failed to connect: $path", previous: $exception);
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
