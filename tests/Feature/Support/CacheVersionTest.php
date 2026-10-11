<?php

use App\Support\Cache\CacheVersion;
use Illuminate\Support\Facades\Cache;

test('a scope starts at version zero and bump() moves it up', function () {
    expect(CacheVersion::current('x'))->toBe(0);

    CacheVersion::bump('x');
    expect(CacheVersion::current('x'))->toBe(1);

    CacheVersion::bump('x');
    expect(CacheVersion::current('x'))->toBe(2);
});

test('remember() caches the value until the scope is bumped', function () {
    $calls = 0;
    $compute = function () use (&$calls) {
        return ++$calls;
    };

    expect(CacheVersion::remember('x', 'k', 60, $compute))->toBe(1);
    expect(CacheVersion::remember('x', 'k', 60, $compute))->toBe(1);

    CacheVersion::bump('x');

    expect(CacheVersion::remember('x', 'k', 60, $compute))->toBe(2);
});

test('bumping one scope leaves the others cached', function () {
    $calls = 0;
    $compute = function () use (&$calls) {
        return ++$calls;
    };

    CacheVersion::remember('a', 'k', 60, $compute);
    CacheVersion::remember('b', 'k', 60, $compute);

    CacheVersion::bump('a');

    expect(CacheVersion::remember('b', 'k', 60, $compute))->toBe(2);
    expect(CacheVersion::remember('a', 'k', 60, $compute))->toBe(3);
});

test('bump() creates the version on a store that cannot increment a missing key', function () {
    config(['cache.default' => 'database']);
    Cache::purge('database');

    CacheVersion::bump('db');

    expect(CacheVersion::current('db'))->toBe(1);
});

test('project() names a per-project scope', function () {
    expect(CacheVersion::project(7))->toBe('project:7');
});

test('a value that depends on several scopes is retired by any of them', function () {
    $calls = 0;
    $compute = function () use (&$calls) {
        return ++$calls;
    };

    expect(CacheVersion::remember(['a', 'b'], 'k', 60, $compute))->toBe(1);
    expect(CacheVersion::remember(['a', 'b'], 'k', 60, $compute))->toBe(1);

    CacheVersion::bump('b');
    expect(CacheVersion::remember(['a', 'b'], 'k', 60, $compute))->toBe(2);

    CacheVersion::bump('a');
    expect(CacheVersion::remember(['a', 'b'], 'k', 60, $compute))->toBe(3);
});
