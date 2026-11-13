<?php

declare(strict_types=1);

return [
    'group_by' => [
        'priority' => 'Priority',
        'status' => 'Status',
    ],
    'no_priority' => [
        'label' => 'No priority',
        'hint' => 'Not prioritised yet',
    ],
    'status_columns' => [
        'todo' => [
            'label' => 'To Do',
            'hint' => 'Not started yet',
        ],
        'in_progress' => [
            'label' => 'In Progress',
            'hint' => 'Being worked on',
        ],
        'done' => [
            'label' => 'Done',
            'hint' => 'Completed',
        ],
    ],
    'update_failed' => 'Failed to update issue :field',
    'fields' => [
        'priority' => 'priority',
        'status' => 'status',
    ],
    'categories' => [
        'todo' => 'todo',
        'in_progress' => 'in progress',
        'done' => 'done',
    ],
    'no_reachable_status' => 'This issue type has no reachable :status status',
];
