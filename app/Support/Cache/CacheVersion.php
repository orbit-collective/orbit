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

    /**
     * Anything an issue list shows: issues, issue types, workflow statuses.
     * Deliberately one global scope: those writers cannot all cheaply say
     * which project they touched, and a bump is a single Redis INCR.
     */
    public const string ISSUES = 'issues';

    /** A user's name or avatar changed, or a user was deleted (shown on issues). */
    public const string USERS = 'users';

    /**
     * What a project's Development view read from GitHub, one scope per kind
     * of data (pulls, checks, commits, branches, issues, insights) so that
     * a change only drops the reads it can have made stale: merging a pull
     * request must not throw away the statistics or the branch list.
     */
    public static function development(int $projectId, string $kind): string
    {
        return "development:$projectId:$kind";
    }

    /**
     * The key `remember()` would use, for callers that read and write several
     * values at once (a batch where only the misses are fetched).
     *
     * @param  string|list<string>  $scopes
     */
    public static function keyFor(string|array $scopes, string $key): string
    {
        $versions = collect((array) $scopes)
            ->map(fn (string $scope) => $scope.'.v'.self::current($scope))
            ->implode('|');

        return "cached:$versions:$key";
    }

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
     * Caches $callback under $key for $ttl seconds. The key embeds the current
     * version of every scope the value depends on, so bumping any one of them
     * retires it.
     *
     * @template T
     *
     * @param  string|list<string>  $scopes
     * @param  Closure(): T  $callback
     * @return T
     */
    public static function remember(string|array $scopes, string $key, int $ttl, Closure $callback): mixed
    {
        return Cache::remember(self::keyFor($scopes, $key), $ttl, $callback);
    }

    private static function key(string $scope): string
    {
        return "version:$scope";
    }
}
