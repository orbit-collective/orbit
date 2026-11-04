<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function sharedLive(): array
{
    $live = null;

    test()->actingAs(User::factory()->create())
        ->get('/')
        ->assertInertia(function ($page) use (&$live) {
            $live = $page->toArray()['props']['live'];
        });

    return $live;
}

test('live updates are off and nothing leaks while Reverb is not configured', function () {
    config(['live.enabled' => false]);

    expect(sharedLive())->toBe(['enabled' => false]);
});

test('the browser gets the public connection but never the secret', function () {
    config([
        'live.enabled' => true,
        'live.client' => ['key' => 'pub-key', 'host' => 'ws.example.com', 'port' => 443, 'scheme' => 'https'],
        'broadcasting.connections.reverb.secret' => 'top-secret',
    ]);

    $live = sharedLive();

    expect($live)->toBe([
        'enabled' => true,
        'key' => 'pub-key',
        'host' => 'ws.example.com',
        'port' => 443,
        'scheme' => 'https',
    ])->and(json_encode($live))->not->toContain('top-secret');
});

test('guests are never handed a connection', function () {
    config(['live.enabled' => true]);

    $this->get('/login')->assertOk()->assertInertia(fn ($page) => $page->where('live', ['enabled' => false]));
});

/**
 * Evaluate the broadcasting and live config files under a temporary
 * environment, then put every variable back exactly as it was.
 *
 * @param  array<string, string|null>  $env
 * @return array{0: array<string, mixed>, 1: array<string, mixed>}
 */
function configFilesWith(array $env): array
{
    $saved = [];

    foreach ($env as $key => $value) {
        $saved[$key] = [getenv($key), $_ENV[$key] ?? null, $_SERVER[$key] ?? null, array_key_exists($key, $_ENV), array_key_exists($key, $_SERVER)];
        putenv($value === null ? $key : "$key=$value");
        $value === null ? [$_ENV[$key], $_SERVER[$key]] = [null, null] : [$_ENV[$key], $_SERVER[$key]] = [$value, $value];
        if ($value === null) {
            unset($_ENV[$key], $_SERVER[$key]);
        }
    }

    try {
        return [require config_path('broadcasting.php'), require config_path('live.php')];
    } finally {
        foreach ($saved as $key => [$process, $envValue, $serverValue, $hadEnv, $hadServer]) {
            putenv($process === false ? $key : "$key=$process");
            $hadEnv ? $_ENV[$key] = $envValue : null;
            $hadServer ? $_SERVER[$key] = $serverValue : null;
            if (! $hadEnv) {
                unset($_ENV[$key]);
            }
            if (! $hadServer) {
                unset($_SERVER[$key]);
            }
        }
    }
}

test('a reverb default without credentials degrades to the null broadcaster', function () {
    [$broadcasting, $live] = configFilesWith([
        'BROADCAST_CONNECTION' => 'reverb',
        'REVERB_APP_KEY' => null,
        'REVERB_APP_SECRET' => null,
        'REVERB_APP_ID' => null,
        'REVERB_HOST' => null,
    ]);

    expect($broadcasting['default'])->toBe('null')->and($live['enabled'])->toBeFalse();
});

test('a reverb default with every credential stays reverb and turns live updates on', function () {
    [$broadcasting, $live] = configFilesWith([
        'BROADCAST_CONNECTION' => 'reverb',
        'REVERB_APP_KEY' => 'k',
        'REVERB_APP_SECRET' => 's',
        'REVERB_APP_ID' => 'i',
        'REVERB_HOST' => 'reverb',
    ]);

    expect($broadcasting['default'])->toBe('reverb')->and($live['enabled'])->toBeTrue();
});

test('credentials alone do not turn live updates on while another broadcaster is selected', function () {
    [$broadcasting, $live] = configFilesWith([
        'BROADCAST_CONNECTION' => 'log',
        'REVERB_APP_KEY' => 'k',
        'REVERB_APP_SECRET' => 's',
        'REVERB_APP_ID' => 'i',
        'REVERB_HOST' => 'reverb',
    ]);

    expect($broadcasting['default'])->toBe('log')->and($live['enabled'])->toBeFalse();
});
