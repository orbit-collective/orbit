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

    /** Most lines one request returns, and the most bytes read from Docker for them. */
    public const int MAX_TAIL = 500;

    private const int MAX_LOG_BYTES = 1024 * 1024;

    /**
     * The last `$tail` log lines of one container of this project. The id must
     * belong to the project (it is checked against the container list), so the
     * endpoint can never be used to read an unrelated container's output.
     *
     * @return array{found: bool, error: string|null, lines: list<array{time: string|null, stream: string, text: string}>}
     */
    public function logs(string $id, int $tail = 200): array
    {
        $known = collect($this->containers()['containers'])->firstWhere('id', substr($id, 0, 12));

        if ($known === null) {
            return ['found' => false, 'error' => 'Unknown container.', 'lines' => []];
        }

        try {
            $response = Http::withOptions(['curl' => [CURLOPT_UNIX_SOCKET_PATH => config('developer-portal.docker.socket')]])
                ->timeout((int) config('developer-portal.docker.timeout'))
                ->get('http://localhost/containers/'.$known['id'].'/logs', [
                    'stdout' => 1,
                    'stderr' => 1,
                    'timestamps' => 1,
                    'tail' => max(1, min($tail, self::MAX_TAIL)),
                ])
                ->throw();

            return ['found' => true, 'error' => null, 'lines' => $this->parseLogs(substr($response->body(), -self::MAX_LOG_BYTES))];
        } catch (Throwable $e) {
            return ['found' => true, 'error' => 'Could not read the logs: '.$e->getMessage(), 'lines' => []];
        }
    }

    /**
     * Docker multiplexes stdout/stderr into 8-byte-headed frames unless the
     * container has a TTY, where the output is plain text. Both are handled;
     * ANSI colour codes are stripped.
     *
     * @return list<array{time: string|null, stream: string, text: string}>
     */
    public function parseLogs(string $raw): array
    {
        $chunks = [];

        if ($this->isMultiplexed($raw)) {
            $offset = 0;
            $length = strlen($raw);

            while ($offset + 8 <= $length) {
                $stream = ord($raw[$offset]) === 2 ? 'stderr' : 'stdout';
                $size = unpack('N', substr($raw, $offset + 4, 4))[1];
                $chunks[] = [$stream, substr($raw, $offset + 8, $size)];
                $offset += 8 + $size;
            }
        } else {
            $chunks[] = ['stdout', $raw];
        }

        $lines = [];

        foreach ($chunks as [$stream, $text]) {
            foreach (preg_split('/\R/', $text) ?: [] as $line) {
                $line = preg_replace('/\e\[[0-9;?]*[A-Za-z]/', '', $line) ?? $line;

                if (trim($line) === '') {
                    continue;
                }

                $time = null;

                if (preg_match('/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s?(.*)$/', $line, $match)) {
                    [, $time, $line] = $match;
                }

                $lines[] = ['time' => $time, 'stream' => $stream, 'text' => mb_convert_encoding($line, 'UTF-8', 'UTF-8')];
            }
        }

        return $lines;
    }

    private function isMultiplexed(string $raw): bool
    {
        return strlen($raw) >= 4 && in_array(ord($raw[0]), [0, 1, 2], true) && substr($raw, 1, 3) === "\0\0\0";
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
