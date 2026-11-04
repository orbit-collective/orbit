<?php

use App\Services\DeveloperPortal\ErrorLogService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    Cache::flush();
    $this->dir = sys_get_temp_dir().'/orbit-errlog-'.uniqid();
    mkdir($this->dir);
    config(['developer-portal.errors.directory' => $this->dir, 'developer-portal.errors.limit' => 50]);
});

afterEach(function () {
    array_map('unlink', glob($this->dir.'/*') ?: []);
    rmdir($this->dir);
});

function logLine(string $when, string $level, string $message): string
{
    return "[$when] local.$level: $message\n";
}

test('it returns nothing when there is no log file', function () {
    $result = app(ErrorLogService::class)->recent();

    expect($result['entries'])->toBe([])
        ->and($result['daily'])->toHaveCount(7)
        ->and(array_sum(array_column($result['daily'], 'total')))->toBe(0);
});

test('it lists errors newest first, with a trimmed stack trace, and skips other levels', function () {
    $today = CarbonImmutable::now()->format('Y-m-d');
    file_put_contents($this->dir.'/laravel.log',
        logLine("$today 10:00:00", 'INFO', 'booted')
        .logLine("$today 10:01:00", 'ERROR', 'first failure {"a":1}')
        ."#0 /app/a.php(1): a()\n#1 /app/b.php(2): b()\n"
        .logLine("$today 10:02:00", 'CRITICAL', 'disk full')
        .logLine("$today 10:03:00", 'WARNING', 'slow query'));

    $entries = app(ErrorLogService::class)->recent()['entries'];

    expect($entries)->toHaveCount(2)
        ->and($entries[0]['level'])->toBe('critical')
        ->and($entries[0]['message'])->toBe('disk full')
        ->and($entries[1]['level'])->toBe('error')
        ->and($entries[1]['trace'])->toBe(['#0 /app/a.php(1): a()', '#1 /app/b.php(2): b()'])
        ->and($entries[0]['id'])->not->toBe($entries[1]['id']);
});

test('it counts warnings, errors and critical entries per day for the last week', function () {
    $today = CarbonImmutable::now();
    $old = $today->subDays(10)->format('Y-m-d');
    $yesterday = $today->subDay()->format('Y-m-d');
    $now = $today->format('Y-m-d');
    file_put_contents($this->dir.'/laravel.log',
        logLine("$old 09:00:00", 'ERROR', 'too old')
        .logLine("$yesterday 09:00:00", 'ERROR', 'e1')
        .logLine("$yesterday 09:01:00", 'WARNING', 'w1')
        .logLine("$now 09:00:00", 'EMERGENCY', 'c1')
        .logLine("$now 09:01:00", 'DEBUG', 'ignored'));

    $daily = collect(app(ErrorLogService::class)->recent()['daily'])->keyBy('date');

    expect($daily)->toHaveCount(7)
        ->and($daily->has($old))->toBeFalse()
        ->and($daily[$yesterday])->toMatchArray(['error' => 1, 'warning' => 1, 'critical' => 0, 'total' => 2])
        ->and($daily[$now])->toMatchArray(['error' => 0, 'critical' => 1, 'total' => 1]);
});

test('it reads only the tail of a large file and the limit caps the list', function () {
    $today = CarbonImmutable::now()->format('Y-m-d');
    $lines = '';
    for ($i = 1; $i <= 30; $i++) {
        $lines .= logLine("$today 10:00:".str_pad((string) $i, 2, '0', STR_PAD_LEFT), 'ERROR', "failure $i");
    }
    file_put_contents($this->dir.'/laravel.log', $lines);
    config(['developer-portal.errors.limit' => 5, 'developer-portal.errors.tail_bytes' => strlen($lines) / 2]);

    $entries = app(ErrorLogService::class)->recent()['entries'];

    expect($entries)->toHaveCount(5)
        ->and($entries[0]['message'])->toBe('failure 30');
});

test('with daily logs the newest file wins', function () {
    $today = CarbonImmutable::now()->format('Y-m-d');
    file_put_contents($this->dir.'/laravel-2020-01-01.log', logLine("$today 08:00:00", 'ERROR', 'old file'));
    touch($this->dir.'/laravel-2020-01-01.log', time() - 100);
    file_put_contents($this->dir.'/laravel-2020-01-02.log', logLine("$today 09:00:00", 'ERROR', 'new file'));

    $entries = app(ErrorLogService::class)->recent()['entries'];

    expect($entries)->toHaveCount(1)->and($entries[0]['message'])->toBe('new file');
});

test('the error list can be paginated from the one cached read', function () {
    $today = CarbonImmutable::now()->format('Y-m-d');
    $lines = '';
    for ($i = 1; $i <= 7; $i++) {
        $lines .= logLine("$today 10:00:0$i", 'ERROR', "failure $i");
    }
    file_put_contents($this->dir.'/laravel.log', $lines);

    $result = app(ErrorLogService::class)->paginated(3);

    expect($result['entries']->total())->toBe(7)
        ->and($result['entries']->perPage())->toBe(3)
        ->and($result['entries']->items())->toHaveCount(3)
        ->and($result['entries']->items()[0]['message'])->toBe('failure 7')
        ->and($result['daily'])->toHaveCount(7)
        ->and(app(ErrorLogService::class)->paginated(5000)['entries']->perPage())->toBe(100)
        ->and(app(ErrorLogService::class)->paginated(0)['entries']->perPage())->toBe((int) config('developer-portal.per_page'));
});
