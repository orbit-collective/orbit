<?php

declare(strict_types=1);

return [
    'label' => 'Merge pull request #:number',
    'method' => 'Merge method',
    'methods' => [
        'merge' => 'Merge commit',
        'squash' => 'Squash',
        'rebase' => 'Rebase',
    ],
    'explain' => [
        'merge' => 'All commits are kept and joined by a merge commit.',
        'squash' => 'All commits become one commit on the base branch.',
        'rebase' => 'The commits are replayed onto the base branch, without a merge commit.',
    ],
    'confirm' => [
        'merge' => 'Confirm merge commit',
        'squash' => 'Confirm squash and merge',
        'rebase' => 'Confirm rebase and merge',
    ],
    'commit_title' => 'Commit title',
    'merging' => 'Merging…',
    'cancel' => 'Cancel',
];
