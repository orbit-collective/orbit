<?php

namespace App\Services\Integrations\Github;

use App\Support\Cache\CacheVersion;
use App\Support\Live\LiveUpdates;

/**
 * Says "what the Development view shows changed" for a project, and which
 * part of it: drops the cached reads of those kinds (so the reload that
 * follows reads GitHub afresh) and tells everyone looking at the project,
 * over the live channel, to read just those kinds again. Merging a pull
 * request announces its list and the commits, not the statistics; a new
 * branch announces the branches. A write made from the view and a GitHub
 * event the relay brought in both come through here; nothing is sent while
 * live updates are off (see LiveUpdates).
 */
class GithubDevelopmentAnnouncer
{
    public const string PULLS = 'pulls';

    public const string CHECKS = 'checks';

    public const string COMMITS = 'commits';

    public const string BRANCHES = 'branches';

    public const string ISSUES = 'issues';

    public const string INSIGHTS = 'insights';

    public const array KINDS = [self::PULLS, self::CHECKS, self::COMMITS, self::BRANCHES, self::ISSUES, self::INSIGHTS];

    /** The live change type is `development.{kind}`; the browser listens for the prefix. */
    public const string CHANGE_PREFIX = 'development.';

    public function __construct(
        protected LiveUpdates $live,
    ) {}

    /**
     * @param  list<string>  $kinds
     * @param  bool  $bust  false when nothing cached went stale (linking an issue only changes what is joined to the cached list on every read), so the others reload cheaply from the cache
     */
    public function announce(int $projectId, array $kinds = self::KINDS, bool $bust = true): void
    {
        foreach ($kinds as $kind) {
            if ($bust) {
                CacheVersion::bump(CacheVersion::development($projectId, $kind));
            }

            $this->live->project($projectId, self::CHANGE_PREFIX.$kind);
        }
    }

    /** Drops every cached read without telling anyone (the refresh button). */
    public function drop(int $projectId): void
    {
        foreach (self::KINDS as $kind) {
            CacheVersion::bump(CacheVersion::development($projectId, $kind));
        }
    }
}
