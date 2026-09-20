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
    public function format(Issue $issue, Project $project): string
    {
        $title = $issue->title;

        return <<<MARKDOWN
        Synced with Orbit

        This pull request is linked to **#$issue->id — {$title}** in **$project->name**.
        MARKDOWN;
    }
}
