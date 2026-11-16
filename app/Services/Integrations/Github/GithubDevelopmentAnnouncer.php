<?php

namespace App\Services\Integrations\Github;

use App\Support\Cache\CacheVersion;
use App\Support\Live\LiveUpdates;

/**
 * Says "what the Development view shows changed" for a project: drops what
 * the view had cached (so the reload that follows reads GitHub afresh) and
 * tells everyone looking at the project's page, over the live channel, to
 * read again. A write made from the view and a GitHub event the relay
 * brought in both come through here; nothing is sent while live updates
 * are off (see LiveUpdates).
 */
class GithubDevelopmentAnnouncer
{
    /** The change type the browser listens for (`project.changed` carries it). */
    public const string CHANGE_TYPE = 'development';

    public function __construct(
        protected LiveUpdates $live,
    ) {}

    public function announce(int $projectId): void
    {
        CacheVersion::bump(CacheVersion::development($projectId));

        $this->live->project($projectId, self::CHANGE_TYPE);
    }
}
