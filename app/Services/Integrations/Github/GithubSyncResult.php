<?php

namespace App\Services\Integrations\Github;

/**
 * The outcome of one GithubIntegrationSynchronizer::sync() call. `locked`
 * and `skipped` are both "nothing went wrong, nothing happened" outcomes -
 * see the synchronizer's docblock for when each applies.
 */
final readonly class GithubSyncResult
{
    private function __construct(
        public bool $locked,
        public bool $skipped,
        public bool $succeeded,
        public ?GithubSyncError $error,
    ) {}

    /** Another sync for this same integration was already in progress. */
    public static function locked(): self
    {
        return new self(locked: true, skipped: false, succeeded: false, error: null);
    }

    /** The integration isn't connected (pending/revoked) - there's nothing to sync. */
    public static function skipped(): self
    {
        return new self(locked: false, skipped: true, succeeded: false, error: null);
    }

    public static function success(): self
    {
        return new self(locked: false, skipped: false, succeeded: true, error: null);
    }

    public static function failure(GithubSyncError $error): self
    {
        return new self(locked: false, skipped: false, succeeded: false, error: $error);
    }
}
