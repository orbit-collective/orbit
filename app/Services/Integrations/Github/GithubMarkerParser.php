<?php

namespace App\Services\Integrations\Github;

/**
 * Parses the one and only supported PR-to-issue link syntax: a hidden HTML
 * comment marker, `<!-- orbit-issue:123 -->`, anywhere in a pull request's
 * description. No title/branch/commit parsing, no fuzzy matching — see
 * documentation/en/integrations for the full contract.
 */
class GithubMarkerParser
{
    private const string PATTERN = '/<!--\s*orbit-issue:(\d+)\s*-->/';

    public function parse(?string $body): GithubMarkerResult
    {
        if ($body === null || $body === '') {
            return GithubMarkerResult::none();
        }

        preg_match_all(self::PATTERN, $body, $matches);

        $issueIds = $matches[1] ?? [];

        return match (count($issueIds)) {
            0 => GithubMarkerResult::none(),
            1 => GithubMarkerResult::single((int) $issueIds[0]),
            default => GithubMarkerResult::ambiguous(),
        };
    }
}
