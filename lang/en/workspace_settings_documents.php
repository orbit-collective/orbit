<?php

declare(strict_types=1);

return [
    'defaults' => [
        'title' => 'Documentation defaults',
        'description' => 'Set structure and access defaults for workspace docs.',
        'access_level' => 'Default access level',
        'members_only' => 'Members only',
        'workspace_and_guests' => 'Workspace and guests',
        'new_folder' => 'New folder',
        'new_template' => 'New template',
        'structure_preview' => 'Document structure preview',
        'folder_docs' => ':name · :count docs',
    ],
    'knowledge' => [
        'title' => 'Knowledge operations',
        'description' => 'Improve organization and long-term discoverability.',
        'indexing' => [
            'title' => 'Content indexing',
            'description' => 'Continuously index workspace documents for fast search.',
        ],
        'retention' => [
            'title' => 'Retention policy',
            'description' => 'Archive stale documents after a selected inactivity period.',
            'value' => '180 days',
        ],
    ],
];
