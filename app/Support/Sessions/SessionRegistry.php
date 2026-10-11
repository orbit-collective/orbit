<?php

namespace App\Support\Sessions;

use Illuminate\Session\SessionManager;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Date;

/**
 * "Where am I signed in?" for session stores that cannot answer it themselves.
 *
 * The `database` session driver keeps one row per session, so the Security
 * page just queries the table. Redis stores an opaque payload per session id
 * and cannot be searched by user, so for any other driver this keeps a small
 * per-user map of session id => device details next to it, refreshed by the
 * EnforceSessionLifetime middleware and read by UserRepository.
 *
 * The map is only an index: a session counts as signed in only while its
 * payload still exists, so expired or revoked sessions drop out on read.
 */
class SessionRegistry
{
    /** Seconds between two registry writes for one session. */
    public const int TOUCH_INTERVAL = 60;

    /** The registry can safely outlive the longest session; entries are pruned on read. */
    private const int TTL = 60 * 60 * 24 * 30;

    public function __construct(private readonly SessionManager $sessions) {}

    /** Session drivers whose payloads cannot be searched by user. */
    private const array DRIVERS = ['redis', 'memcached', 'dynamodb'];

    /** The `database` driver lists its own rows; the rest (file, array, cookie) are never listed. */
    public function enabled(): bool
    {
        return in_array(config('session.driver'), self::DRIVERS, true);
    }

    public function touch(int $userId, string $sessionId, ?string $ipAddress, ?string $userAgent): void
    {
        $this->withLock($userId, function () use ($userId, $sessionId, $ipAddress, $userAgent) {
            $entries = $this->entries($userId);
            $entries[$sessionId] = [
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'last_activity' => Date::now()->getTimestamp(),
            ];

            Cache::put($this->key($userId), $entries, self::TTL);
        });
    }

    /**
     * The user's live sessions, newest activity first, shaped like the rows of
     * the `sessions` table.
     *
     * @return Collection<int, object>
     */
    public function forUser(int $userId): Collection
    {
        $entries = $this->entries($userId);
        $live = array_filter($entries, fn (string $id) => $this->isAlive($id), ARRAY_FILTER_USE_KEY);

        if (count($live) !== count($entries)) {
            $this->withLock($userId, fn () => Cache::put($this->key($userId), $live, self::TTL));
        }

        return collect($live)
            ->map(fn (array $entry, string $id) => (object) ['id' => $id, 'user_id' => $userId, ...$entry])
            ->sortByDesc('last_activity')
            ->values();
    }

    /** Signs one session out. False when it is not one of the user's live sessions. */
    public function revoke(int $userId, string $sessionId): bool
    {
        $entries = $this->entries($userId);

        if (! array_key_exists($sessionId, $entries) || ! $this->isAlive($sessionId)) {
            return false;
        }

        $this->handler()->destroy($sessionId);
        $this->forget($userId, $sessionId);

        return true;
    }

    /** Signs every session of the user out except one; returns how many. */
    public function revokeOthers(int $userId, string $exceptSessionId): int
    {
        $others = $this->forUser($userId)->pluck('id')->reject($exceptSessionId);

        $others->each(function (string $id) use ($userId) {
            $this->handler()->destroy($id);
            $this->forget($userId, $id);
        });

        return $others->count();
    }

    public function forget(int $userId, string $sessionId): void
    {
        $this->withLock($userId, function () use ($userId, $sessionId) {
            $entries = $this->entries($userId);
            unset($entries[$sessionId]);

            Cache::put($this->key($userId), $entries, self::TTL);
        });
    }

    /** @return array<string, array{ip_address: ?string, user_agent: ?string, last_activity: int}> */
    private function entries(int $userId): array
    {
        return Cache::get($this->key($userId), []);
    }

    private function isAlive(string $sessionId): bool
    {
        return $this->handler()->read($sessionId) !== '';
    }

    private function handler(): \SessionHandlerInterface
    {
        return $this->sessions->driver()->getHandler();
    }

    private function key(int $userId): string
    {
        return "user:$userId:sessions";
    }

    /** Serialises the read-modify-write so two requests cannot drop each other's entry. */
    private function withLock(int $userId, callable $callback): void
    {
        Cache::lock($this->key($userId).':lock', 5)->block(2, $callback);
    }
}
