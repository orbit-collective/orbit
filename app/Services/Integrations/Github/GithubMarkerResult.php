<?php

namespace App\Services\Integrations\Github;

/**
 * The result of parsing a PR body for the `<!-- orbit-issue:ID -->` marker.
 * Never exposes a "first match wins" fallback — a caller must explicitly
 * check `isAmbiguous()` before ever reading `issueId`.
 */
final readonly class GithubMarkerResult
{
    private function __construct(
        public GithubMarkerOutcome $outcome,
        public ?int $issueId,
    ) {}

    public static function none(): self
    {
        return new self(GithubMarkerOutcome::None, null);
    }

    public static function single(int $issueId): self
    {
        return new self(GithubMarkerOutcome::Single, $issueId);
    }

    public static function ambiguous(): self
    {
        return new self(GithubMarkerOutcome::Ambiguous, null);
    }

    public function isNone(): bool
    {
        return $this->outcome === GithubMarkerOutcome::None;
    }

    public function isSingle(): bool
    {
        return $this->outcome === GithubMarkerOutcome::Single;
    }

    public function isAmbiguous(): bool
    {
        return $this->outcome === GithubMarkerOutcome::Ambiguous;
    }
}
