<?php

declare(strict_types=1);

return [
    'title' => 'Invite by email',
    'description_enabled' => 'Send a one-time invite link to a teammate\'s email address.',
    'description_disabled' => 'Email notifications aren\'t configured yet, so invitations are disabled.',
    'unavailable' => [
        'title' => 'Invitations unavailable',
        'description' => 'Ask an administrator to configure outgoing email to enable project invitations.',
    ],
    'email_placeholder' => 'teammate@company.com',
    'invite' => 'Invite',
    'no_permission' => [
        'title' => 'You don\'t have permission to invite',
        'description' => 'Ask someone who can manage members to invite new teammates.',
    ],
];
