<?php

declare(strict_types=1);

return [
    'pending' => ':count pending',
    'title' => 'Pending invitations',
    'description' => 'Invitations that haven\'t been accepted yet.',
    'empty' => [
        'title' => 'No pending invitations',
        'description' => 'Everyone you\'ve invited has already joined, or you haven\'t invited anyone yet.',
    ],
    'invited' => 'Invited by :name as :role · expires :date',
    'someone' => 'someone',
    'custom_roles' => '+ custom roles:',
    'unknown_role' => 'Unknown role',
    'revoke' => 'Revoke',
    'roles' => [
        'owner' => 'Owner',
        'admin' => 'Admin',
        'member' => 'Member',
        'viewer' => 'Viewer',
    ],
];
