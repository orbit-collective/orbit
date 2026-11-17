<?php

declare(strict_types=1);

return [
    'label' => 'Merge pull request #:number',
    'title' => 'Merge this pull request',
    'summary' => 'Merges with: :method',
    'open' => 'Merge…',
    'hide' => 'Hide',
    'method' => 'Merge method',
    'methods' => [
        'merge' => 'Merge commit',
        'squash' => 'Squash',
        'rebase' => 'Rebase',
    ],
    'explain' => [
        'merge' => 'Keeps every commit and joins them with a merge commit.',
        'squash' => 'Turns all commits into one on the base branch.',
        'rebase' => 'Replays the commits onto the base branch, with no merge commit.',
    ],
    'confirm' => [
        'merge' => 'Merge pull request',
        'squash' => 'Squash and merge',
        'rebase' => 'Rebase and merge',
    ],
    'commit_title' => 'Commit title',
    'merging' => 'Merging…',
    'cancel' => 'Cancel',
];
