<?php

namespace App\Services\Integrations\Github;

use App\Models\Issue;
use App\Models\Project;

/**
 * The GitHub bot comment left on a pull request once it's linked — plain and
 * short by design (see the MVP spec: no emoji, no large markdown sections).
 */
class GithubCommentFormatter
{
    /**
     * @param  non-empty-list<Issue>  $issues  every issue the pull request was linked to
     */
    public function format(array $issues, Project $project): string
    {
        if (count($issues) === 1) {
            [$issue] = $issues;

            return <<<MARKDOWN
            Synced with Orbit

            This pull request is linked to **#$issue->number — $issue->title** in **$project->name**.
            MARKDOWN;
        }

        $list = implode("\n", array_map(fn (Issue $issue) => "- **#$issue->number — $issue->title**", $issues));

        return <<<MARKDOWN
        Synced with Orbit

        This pull request is linked to these issues in **$project->name**:

        $list
        MARKDOWN;
    }
}
