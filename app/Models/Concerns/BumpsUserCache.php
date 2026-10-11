<?php

namespace App\Models\Concerns;

use App\Support\Cache\CacheVersion;

/**
 * Cached issue lists embed each person's name and avatar, so changing either,
 * or deleting the account, retires them.
 */
trait BumpsUserCache
{
    protected static function bootBumpsUserCache(): void
    {
        static::saved(function ($user) {
            if ($user->wasChanged(['name', 'avatar'])) {
                CacheVersion::bump(CacheVersion::USERS);
            }
        });
        static::deleted(fn () => CacheVersion::bump(CacheVersion::USERS));
    }
}
