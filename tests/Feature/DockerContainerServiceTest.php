<?php

use App\Services\DeveloperPortal\DockerContainerService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Cache::flush();
    config(['developer-portal.docker.socket' => __FILE__]);
});

function fakeDocker(array $inspect = []): void
{
    Http::fake([
        'localhost/containers/json*' => Http::response([
            ['Id' => 'bbbbbbbbbbbbbbbb', 'Names' => ['/orbit-queue-1'], 'Image' => 'orbit-queue', 'State' => 'running', 'Status' => 'Up 2 hours', 'Labels' => ['com.docker.compose.service' => 'queue']],
            ['Id' => 'aaaaaaaaaaaaaaaa', 'Names' => ['/orbit-app-1'], 'Image' => 'orbit-app', 'State' => 'exited', 'Status' => 'Exited (1) a minute ago', 'Labels' => ['com.docker.compose.service' => 'app']],
        ]),
        'localhost/containers/bbbbbbbbbbbbbbbb/json' => Http::response($inspect + [
            'State' => ['Running' => true, 'StartedAt' => gmdate('Y-m-d\TH:i:s\Z', time() - 7200), 'Health' => ['Status' => 'healthy']],
            'RestartCount' => 2,
        ]),
        'localhost/containers/aaaaaaaaaaaaaaaa/json' => Http::response([
            'State' => ['Running' => false, 'StartedAt' => '0001-01-01T00:00:00Z'],
        ]),
    ]);
}

test('it lists the compose containers with their uptime, sorted by service', function () {
    fakeDocker();

    $result = app(DockerContainerService::class)->containers();

    expect($result['available'])->toBeTrue()
        ->and($result['error'])->toBeNull()
        ->and(collect($result['containers'])->pluck('service')->all())->toBe(['app', 'queue']);

    [$app, $queue] = $result['containers'];

    expect($queue['state'])->toBe('running')
        ->and($queue['health'])->toBe('healthy')
        ->and($queue['restartCount'])->toBe(2)
        ->and($queue['id'])->toBe('bbbbbbbbbbbb')
        ->and($queue['uptimeSeconds'])->toBeBetween(7190, 7300)
        ->and($queue['startedAt'])->not->toBeNull()
        ->and($app['startedAt'])->toBeNull()
        ->and($app['uptimeSeconds'])->toBe(0);
});

test('it only asks for containers of the configured compose project', function () {
    fakeDocker();
    config(['developer-portal.docker.project' => 'myproj']);

    app(DockerContainerService::class)->containers();

    Http::assertSent(fn ($request) => str_contains(urldecode($request->url()), 'com.docker.compose.project=myproj'));
});

test('the result is cached for a few seconds', function () {
    fakeDocker();

    app(DockerContainerService::class)->containers();
    app(DockerContainerService::class)->containers();

    Http::assertSentCount(3);
});

test('a missing socket is reported without calling docker', function () {
    Http::fake();
    config(['developer-portal.docker.socket' => '/nonexistent/docker.sock']);

    $result = app(DockerContainerService::class)->containers();

    expect($result['available'])->toBeFalse()
        ->and($result['error'])->toContain('Docker socket not found')
        ->and($result['containers'])->toBe([]);
    Http::assertNothingSent();
});

test('an unreachable docker daemon is reported, not thrown', function () {
    Http::fake(['*' => Http::response('boom', 500)]);

    $result = app(DockerContainerService::class)->containers();

    expect($result['available'])->toBeFalse()
        ->and($result['error'])->toContain('Docker is not reachable');
});

function frame(int $stream, string $text): string
{
    return chr($stream)."\0\0\0".pack('N', strlen($text)).$text;
}

test('it demultiplexes docker log frames into stdout and stderr lines with timestamps', function () {
    $raw = frame(1, "2026-11-04T10:00:00.123456789Z booted\n2026-11-04T10:00:01Z ready\n")
        .frame(2, "2026-11-04T10:00:02Z \e[31mboom\e[0m\n")
        .frame(1, "\n");

    $lines = app(DockerContainerService::class)->parseLogs($raw);

    expect($lines)->toHaveCount(3)
        ->and($lines[0])->toBe(['time' => '2026-11-04T10:00:00.123456789Z', 'stream' => 'stdout', 'text' => 'booted'])
        ->and($lines[1]['text'])->toBe('ready')
        ->and($lines[2])->toBe(['time' => '2026-11-04T10:00:02Z', 'stream' => 'stderr', 'text' => 'boom']);
});

test('a tty container streams plain text instead of frames', function () {
    $lines = app(DockerContainerService::class)->parseLogs("2026-11-04T10:00:00Z hello\nno timestamp here\n");

    expect($lines)->toHaveCount(2)
        ->and($lines[0]['text'])->toBe('hello')
        ->and($lines[1])->toBe(['time' => null, 'stream' => 'stdout', 'text' => 'no timestamp here']);
});

test('empty output and a truncated frame do not break parsing', function () {
    $service = app(DockerContainerService::class);

    expect($service->parseLogs(''))->toBe([])
        ->and($service->parseLogs(substr(frame(1, "line\n"), 0, 6)))->toBe([]);
});

test('logs are fetched with a bounded tail for a known container only', function () {
    fakeDocker();
    Http::fake([
        'localhost/containers/bbbbbbbbbbbb/logs*' => Http::response(frame(1, "2026-11-04T10:00:00Z up\n")),
    ] + []);

    $service = app(DockerContainerService::class);
    $result = $service->logs('bbbbbbbbbbbb', 99999);

    expect($result['found'])->toBeTrue()
        ->and($result['error'])->toBeNull()
        ->and($result['lines'][0]['text'])->toBe('up');
    Http::assertSent(fn ($request) => str_contains($request->url(), '/logs') && str_contains($request->url(), 'tail=500'));

    $unknown = $service->logs('ffffffffffff');
    expect($unknown['found'])->toBeFalse()->and($unknown['lines'])->toBe([]);
});

test('a docker error while reading logs is reported, not thrown', function () {
    fakeDocker();
    Http::fake(['localhost/containers/bbbbbbbbbbbb/logs*' => Http::response('nope', 500)]);

    $result = app(DockerContainerService::class)->logs('bbbbbbbbbbbb');

    expect($result['found'])->toBeTrue()->and($result['error'])->toContain('Could not read the logs');
});
