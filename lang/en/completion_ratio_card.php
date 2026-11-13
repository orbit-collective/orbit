<?php

declare(strict_types=1);

return [
    'title' => 'Completion Ratio',
    'description' => 'Resolution status of all logged tasks',
    'tier' => [
        'excellent' => 'Excellent',
        'on_track' => 'On track',
        'needs_attention' => 'Needs attention',
    ],
    'bars' => [
        'todo' => 'To Do',
        'in_progress' => 'In Progress',
        'done' => 'Done',
    ],
    'resolved_of' => ':done of :total resolved',
    'issues_of' => ':done of :total issues',
    'resolved' => 'Resolved',
];
