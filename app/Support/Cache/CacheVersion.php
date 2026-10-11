<?php

namespace App\Support\Cache;

use Closure;
use Illuminate\Support\Facades\Cache;

/**
 * Invalidation by version number instead of by key. Cached values that depend
 * on a broad slice of data (a project's labels, who is a member of what) live
 * under a key that embeds the current version of their "scope"; a writer calls
 * bump() and every key built from the old version simply stops being read and
 * ages out through its TTL. That needs no list of keys to forget and works on
 * every cache store, unlike tags.
 */
final class CacheVersion
{
    /** Anything that changes who belongs to which project, or what a role may do. */
    public const string MEMBERSHIP = 'membership';

    public static function project(int $projectId): string
    {
        return "project:$projectId";
    }

    public static function current(string $scope): int
    {
        return (int) Cache::get(self::key($scope), 0);
    }

    public static function bump(string $scope): void
    {
        // increment() is atomic on Redis but returns false for a missing key
        // on stores that cannot create it (the database store).
        if (Cache::increment(self::key($scope)) === false) {
            Cache::forever(self::key($scope), 1);
        }
    }

    /**
     * Caches $callback under $key for $ttl seconds, scoped to $scope's current
     * version.
     *
     * @template T
     *
     * @param  Closure(): T  $callback
     * @return T
     */
    public static function remember(string $scope, string $key, int $ttl, Closure $callback): mixed
    {
        return Cache::remember(self::key($scope).':v'.self::current($scope).":$key", $ttl, $callback);
    }

    private static function key(string $scope): string
    {
        return "version:$scope";
    }
}
