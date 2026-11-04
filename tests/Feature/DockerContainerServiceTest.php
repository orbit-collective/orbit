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
