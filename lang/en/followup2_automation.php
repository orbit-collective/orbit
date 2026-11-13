<?php

declare(strict_types=1);

return [
    'triggers' => [
        'issue_status_changed' => 'Issue status changed',
        'github_pull_request_opened' => 'GitHub pull request opened',
        'github_pull_request_reopened' => 'GitHub pull request reopened',
        'github_pull_request_closed' => 'GitHub pull request closed',
        'github_pull_request_merged' => 'GitHub pull request merged',
        'github_pull_request_synchronized' => 'GitHub pull request updated',
    ],
    'actions' => [
        'change_status' => 'Change status',
        'change_priority' => 'Change priority',
        'assign_user' => 'Assign user',
        'add_label' => 'Add label',
        'remove_label' => 'Remove label',
        'send_notification' => 'Send notification',
    ],
];
