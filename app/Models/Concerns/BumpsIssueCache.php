<?php

namespace App\Models\Concerns;

use App\Support\Cache\CacheVersion;

/**
 * For models an issue list shows or embeds (the issue itself, its type, its
 * workflow status): any save or delete retires every cached issue list.
 *
 * Model events do not fire for query-builder updates and deletes, so those
 * (and cascades) bump CacheVersion::ISSUES by hand where they happen.
 */
trait BumpsIssueCache
{
    protected static function bootBumpsIssueCache(): void
    {
        static::saved(fn () => CacheVersion::bump(CacheVersion::ISSUES));
        static::deleted(fn () => CacheVersion::bump(CacheVersion::ISSUES));
    }
}
