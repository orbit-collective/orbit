<?php

declare(strict_types=1);

return [
    'fields' => [
        'status_changed' => [
            'issue_id' => "Issue ID",
            'issue_status' => "Status name (new)",
            'issue_previousStatus' => "Status name (previous)",
            'issue_category' => "Status category (new)",
            'issue_previousCategory' => "Status category (previous)",
        ],
        'pull_request' => [
            'issue_id' => "Issue ID",
            'issue_title' => "Issue title",
            'issue_status' => "Status name",
            'issue_category' => "Status category",
            'project_id' => "Project ID",
            'project_name' => "Project name",
            'repository_owner' => "Repository owner",
            'repository_name' => "Repository name",
            'pullRequest_number' => "Pull request number",
            'pullRequest_title' => "Pull request title",
            'pullRequest_url' => "Pull request URL",
            'pullRequest_sourceBranch' => "Pull request source branch",
            'pullRequest_targetBranch' => "Pull request target branch",
            'pullRequest_state' => "Pull request state",
        ],
    ],
];
