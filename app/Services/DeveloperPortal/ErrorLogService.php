<?php

namespace App\Services\DeveloperPortal;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;

/**
 * The newest errors of the application log, plus per-day counts for the last
 * week. Only the tail of the newest `laravel*.log` is read (the file can be
 * tens of megabytes), so counts cover as much history as that tail holds.
 * Results are cached for a few seconds.
 */
class ErrorLogService
{
    private const int CACHE_TTL = 5;

    private const string HEADER = '/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] [\w.-]+\.(DEBUG|INFO|NOTICE|WARNING|ERROR|CRITICAL|ALERT|EMERGENCY): (.*)$/';

    /** Levels listed as errors; the daily breakdown also counts warnings. */
    private const array ERROR_LEVELS = ['ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY'];

    /** Lines of a stack trace kept per entry. */
    private const int TRACE_LINES = 6;

    /**
     * @return array{
     *     entries: list<array{id: string, level: string, message: string, loggedAt: string, trace: list<string>}>,
     *     daily: list<array{date: string, label: string, warning: int, error: int, critical: int, total: int}>
     * }
     */
    public function recent(): array
    {
        return Cache::remember('developer-portal:errors', self::CACHE_TTL, fn () => $this->read());
    }

    /** @return array{entries: list<array<string, mixed>>, daily: list<array<string, mixed>>} */
    private function read(): array
    {
        $parsed = $this->parse($this->tail());
        $limit = (int) config('developer-portal.errors.limit');

        $entries = collect($parsed)
            ->filter(fn (array $entry) => in_array($entry['level'], self::ERROR_LEVELS, true))
            ->sortByDesc('loggedAt')
            ->take($limit)
            ->values()
            ->map(fn (array $entry) => [
                'id' => md5($entry['loggedAt'].$entry['message']),
                'level' => strtolower($entry['level']),
                'message' => $entry['message'],
                'loggedAt' => $entry['loggedAt'],
                'trace' => $entry['trace'],
            ])
            ->all();

        return ['entries' => $entries, 'daily' => $this->daily($parsed)];
    }

    /**
     * @param  list<array{level: string, message: string, loggedAt: string, trace: list<string>}>  $entries
     * @return list<array{date: string, label: string, warning: int, error: int, critical: int, total: int}>
     */
    private function daily(array $entries): array
    {
        $days = max(1, (int) config('developer-portal.errors.days'));
        $today = CarbonImmutable::now()->startOfDay();
        $buckets = [];

        for ($i = $days - 1; $i >= 0; $i--) {
            $day = $today->subDays($i);
            $buckets[$day->toDateString()] = [
                'date' => $day->toDateString(),
                'label' => $day->format('D'),
                'warning' => 0,
                'error' => 0,
                'critical' => 0,
                'total' => 0,
            ];
        }

        foreach ($entries as $entry) {
            $date = substr($entry['loggedAt'], 0, 10);

            if (! isset($buckets[$date])) {
                continue;
            }

            $kind = match ($entry['level']) {
                'WARNING' => 'warning',
                'ERROR' => 'error',
                'CRITICAL', 'ALERT', 'EMERGENCY' => 'critical',
                default => null,
            };

            if ($kind !== null) {
                $buckets[$date][$kind]++;
                $buckets[$date]['total']++;
            }
        }

        return array_values($buckets);
    }

    /**
     * @return list<array{level: string, message: string, loggedAt: string, trace: list<string>}>
     */
    private function parse(string $text): array
    {
        $entries = [];
        $current = null;

        foreach (preg_split('/\R/', $text) ?: [] as $line) {
            if (preg_match(self::HEADER, $line, $match)) {
                if ($current !== null) {
                    $entries[] = $current;
                }

                $current = [
                    'level' => $match[2],
                    'message' => mb_strimwidth($match[3], 0, 300, '…'),
                    'loggedAt' => $match[1],
                    'trace' => [],
                ];
            } elseif ($current !== null && $line !== '' && count($current['trace']) < self::TRACE_LINES) {
                $current['trace'][] = mb_strimwidth($line, 0, 200, '…');
            }
        }

        if ($current !== null) {
            $entries[] = $current;
        }

        return $entries;
    }

    /** The last `tail_bytes` of the newest log file, starting at a line boundary. */
    private function tail(): string
    {
        $files = glob(rtrim((string) config('developer-portal.errors.directory'), '/').'/laravel*.log') ?: [];

        if ($files === []) {
            return '';
        }

        usort($files, fn (string $a, string $b) => filemtime($b) <=> filemtime($a));
        $path = $files[0];
        $size = (int) filesize($path);
        $bytes = (int) config('developer-portal.errors.tail_bytes');
        $handle = fopen($path, 'rb');

        if ($handle === false) {
            return '';
        }

        try {
            if ($size > $bytes) {
                fseek($handle, $size - $bytes);
                fgets($handle); // drop the partial line
            }

            return (string) stream_get_contents($handle);
        } finally {
            fclose($handle);
        }
    }
}
