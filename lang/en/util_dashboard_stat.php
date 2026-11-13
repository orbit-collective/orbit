<?php

declare(strict_types=1);

return [
    'counts' => [
        'open' => [
            'title' => 'Open Issues',
            'hint' => 'Active tasks assigned/open',
        ],
        'todo' => [
            'title' => 'To Do',
            'hint' => 'Issues waiting to be started',
        ],
        'in_progress' => [
            'title' => 'In Progress',
            'hint' => 'Issues being worked on',
        ],
        'done' => [
            'title' => 'Done Issues',
            'hint' => 'Issues that are finished',
        ],
        'all' => [
            'title' => 'All Issues',
            'hint' => 'Every issue in your projects',
        ],
    ],
    'metrics' => [
        'projects' => [
            'title' => 'Active Projects',
            'hint' => 'Tracked projects in workspace',
        ],
        'critical' => [
            'title' => 'Critical Tasks',
            'hint' => 'Issues at the top of their priority scale',
        ],
        'resolution' => [
            'title' => 'Resolution Rate',
            'hint' => 'Share of issues that are done',
        ],
        'overdue' => [
            'title' => 'Overdue Issues',
            'hint' => 'Open issues past their due date',
        ],
        'assigned' => [
            'title' => 'Assigned to Me',
            'hint' => 'Open issues assigned to you',
        ],
        'due_soon' => [
            'title' => 'Due Soon',
            'hint' => 'Open issues due within a week',
        ],
    ],
];
