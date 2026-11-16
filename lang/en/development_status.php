<?php

declare(strict_types=1);

return [
    'pull_request' => [
        'open' => 'Open',
        'draft' => 'Draft',
        'merged' => 'Merged',
        'closed' => 'Closed',
    ],
    'ci' => [
        'passed' => 'Checks passed',
        'failed' => 'Checks failed',
        'pending' => 'Checks running',
        'none' => 'No checks',
    ],
    'mergeable' => [
        'clean' => 'Ready to merge',
        'unstable' => 'Checks not passing',
        'behind' => 'Behind the base branch',
        'blocked' => 'Blocked by branch rules',
        'dirty' => 'Has conflicts',
    ],
    'review' => [
        'approved' => 'Approved',
        'changes_requested' => 'Changes requested',
        'commented' => 'Commented',
    ],
];
