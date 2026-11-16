<?php

declare(strict_types=1);

return [
    'title' => 'Customize the development view',
    'pull_requests' => 'Pull requests',
    'pull_requests_hint' => 'Pull requests are read by their last update, newest first, a page at a time.',
    'range' => 'Time range',
    'range_short' => [
        '7d' => '7 days',
        '30d' => '30 days',
        '90d' => '90 days',
        '180d' => '6 months',
        '365d' => '1 year',
        'all' => 'All time',
    ],
    'ranges' => [
        '7d' => 'Updated in the last 7 days',
        '30d' => 'Updated in the last 30 days',
        '90d' => 'Updated in the last 90 days',
        '180d' => 'Updated in the last 6 months',
        '365d' => 'Updated in the last year',
        'all' => 'Updated at any time',
    ],
    'limit' => 'Most pull requests to read',
    'limit_hint' => 'Most pull requests read for the range. A larger number takes longer to arrive; the newest come first either way.',
    'lists' => 'Lists',
    'activity_weeks' => 'Weeks of commit activity',
    'commits_shown' => 'Latest commits shown',
    'sections' => 'Sections',
    'sections_hint' => 'A hidden section is not shown and not read from GitHub, which makes the view lighter.',
    'section' => [
        'stats' => 'Statistics',
        'issues' => 'GitHub issues',
        'insights' => 'Activity, contributors and languages',
        'branches' => 'Branches',
        'commits' => 'Latest commits',
    ],
    'reset' => 'Reset to defaults',
    'done' => 'Done',
];
