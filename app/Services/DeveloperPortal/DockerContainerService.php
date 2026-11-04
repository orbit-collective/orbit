<?php

namespace App\Services\DeveloperPortal;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Reads the containers of this Compose project from the Docker Engine API over
 * its Unix socket (mounted read-only into the app service). The list endpoint
 * has no exact start time, so each container is inspected for `StartedAt`; the
 * whole result is cached for a few seconds so several open tabs cost one round
 * of calls. The browser ticks the uptime itself from `startedAt`.
 *
 * Never throws: without a reachable socket the portal shows a hint instead.
 */
class DockerContainerService
{
    private const int CACHE_TTL = 5;

    /** @return array{available: bool, error: string|null, containers: list<array<string, mixed>>} */
    public function containers(): array
    {
        return Cache::remember('developer-portal:containers', self::CACHE_TTL, fn () => $this->fetch());
    }

    /** @return array{available: bool, error: string|null, containers: list<array<string, mixed>>} */
    private function fetch(): array
    {
        $socket = (string) config('developer-portal.docker.socket');

        if (! is_readable($socket) && ! file_exists($socket)) {
            return $this->unavailable('Docker socket not found. Mount /var/run/docker.sock into the app container.');
        }

        try {
            $list = $this->request('/containers/json', [
                'all' => 1,
                'filters' => json_encode(['label' => ['com.docker.compose.project='.config('developer-portal.docker.project')]]),
            ]);

            $containers = collect($list)
                ->map(fn (array $summary) => $this->describe($summary))
                ->sortBy('service')
                ->values()
                ->all();

            return ['available' => true, 'error' => null, 'containers' => $containers];
        } catch (Throwable $e) {
            return $this->unavailable('Docker is not reachable: '.$e->getMessage());
        }
    }

    /**
     * @param  array<string, mixed>  $summary
     * @return array<string, mixed>
     */
    private function describe(array $summary): array
    {
        $inspect = $this->request('/containers/'.$summary['Id'].'/json');
        $state = $inspect['State'] ?? [];
        $running = ($state['Running'] ?? false) === true;
        $startedAt = $running ? $this->isoOrNull($state['StartedAt'] ?? null) : null;

        return [
            'id' => substr((string) $summary['Id'], 0, 12),
            'service' => $summary['Labels']['com.docker.compose.service'] ?? ltrim((string) ($summary['Names'][0] ?? ''), '/'),
            'name' => ltrim((string) ($summary['Names'][0] ?? ''), '/'),
            'image' => $summary['Image'] ?? '',
            'state' => $summary['State'] ?? 'unknown',
            'status' => $summary['Status'] ?? '',
            'health' => $state['Health']['Status'] ?? null,
            'startedAt' => $startedAt,
            'uptimeSeconds' => $startedAt !== null ? max(0, time() - strtotime($startedAt)) : 0,
            'restartCount' => (int) ($inspect['RestartCount'] ?? 0),
        ];
    }

    /** Docker reports "0001-01-01T00:00:00Z" for a container that never started. */
    private function isoOrNull(?string $value): ?string
    {
        if ($value === null || str_starts_with($value, '0001-')) {
            return null;
        }

        $time = strtotime($value);

        return $time === false ? null : gmdate('c', $time);
    }

    /**
     * @param  array<string, mixed>  $query
     * @return array<int|string, mixed>
     */
    private function request(string $path, array $query = []): array
    {
        return Http::withOptions(['curl' => [CURLOPT_UNIX_SOCKET_PATH => config('developer-portal.docker.socket')]])
            ->timeout((int) config('developer-portal.docker.timeout'))
            ->acceptJson()
            ->get('http://localhost'.$path, $query)
            ->throw()
            ->json();
    }

    /** @return array{available: bool, error: string, containers: list<never>} */
    private function unavailable(string $error): array
    {
        return ['available' => false, 'error' => $error, 'containers' => []];
    }
}
