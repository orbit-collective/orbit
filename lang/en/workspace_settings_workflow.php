<?php

declare(strict_types=1);

return [
    'categories' => [
        'todo' => 'To Do',
        'in_progress' => 'In Progress',
        'done' => 'Done',
    ],
    'title' => ':type workflow',
    'reorder_aria' => 'Reorder :name',
    'start' => 'Start',
    'no_transitions' => 'No transitions',
    'transitions_count' => ':count transition|:count transitions',
    'make_initial_title' => 'Make this the starting status',
    'make_initial_aria' => 'Make :name the starting status',
    'delete_title' => 'Delete status',
    'delete_aria' => 'Delete :name',
    'add_error' => 'Could not add this status.',
    'reorder_error' => 'Could not reorder the statuses.',
    'initial_error' => 'Could not change the starting status.',
    'delete_error' => 'Could not remove this status. Make sure no issues use it and at least one status remains.',
    'flow' => 'Flow',
    'flow_description_edit' => 'The stages an issue of this type moves through. Drag a status to reorder the flow.',
    'flow_description' => 'The stages an issue of this type moves through.',
    'new_status_placeholder' => 'New status name',
    'category' => 'Category',
    'add_status' => 'Add status',
    'use_color' => 'Use color :color',
    'transitions' => 'Transitions',
    'transitions_description' => 'For each status, pick which other statuses an issue may move directly to from there.',
    'from' => 'From',
    'allow_transition' => 'Allow transition from :from to :to',
];
