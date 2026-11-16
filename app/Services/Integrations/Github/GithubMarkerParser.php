<?php

namespace App\Services\Integrations\Github;

/**
 * Parses the one and only supported PR-to-issue link syntax: a hidden HTML
 * comment marker, `<!-- orbit-issue:123 -->`, anywhere in a pull request's
 * description. One marker per issue: a pull request that carries several
 * markers is linked to all of those issues. No title/branch/commit parsing,
 * no fuzzy matching — see documentation/en/integrations for the full
 * contract.
 */
class GithubMarkerParser
{
    private const string PATTERN = '/<!--\s*orbit-issue:(\d+)\s*-->/';

    /**
     * @return list<int> the distinct issue ids, in the order they appear
     */
    public function parse(?string $body): array
    {
        if ($body === null || $body === '') {
            return [];
        }

        preg_match_all(self::PATTERN, $body, $matches);

        return array_values(array_unique(array_map('intval', $matches[1] ?? [])));
    }

    /** The marker text for one issue - the exact string parse() recognises. */
    public function marker(int $issueId): string
    {
        return "<!-- orbit-issue:$issueId -->";
    }

    /** Adds the issue's marker to a description unless it already has it. */
    public function withMarker(?string $body, int $issueId): string
    {
        $body = rtrim((string) $body);

        if (in_array($issueId, $this->parse($body), true)) {
            return $body;
        }

        return trim($body."\n\n".$this->marker($issueId));
    }

    /** Removes every marker of the issue (and the blank line it leaves behind). */
    public function withoutMarker(?string $body, int $issueId): string
    {
        $stripped = preg_replace('/[ \t]*<!--\s*orbit-issue:'.$issueId.'\s*-->[ \t]*\R?/', '', (string) $body);

        return trim(preg_replace('/\n{3,}/', "\n\n", $stripped));
    }
}
