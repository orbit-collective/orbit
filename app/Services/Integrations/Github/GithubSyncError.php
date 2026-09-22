<?php

namespace App\Services\Integrations\Github;

/**
 * A classified sync failure: a stable machine-readable code (or null for an
 * unclassified/transport-level failure), a curated message safe to show a
 * user (never the raw exception text — see GithubIntegrationErrorClassifier),
 * and whether it's worth retrying automatically.
 */
final readonly class GithubSyncError
{
    public function __construct(
        public ?string $code,
        public string $safeMessage,
        public bool $isTransient,
    ) {}
}
