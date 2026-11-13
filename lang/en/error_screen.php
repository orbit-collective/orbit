<?php

declare(strict_types=1);

return [
    'copy' => [
        '403' => [
            'title' => 'Access denied',
            'text' => 'You do not have permission to open this page. Ask a project owner or admin for access.',
        ],
        '404' => [
            'title' => 'Page not found',
            'text' => 'The link may be broken or the page may have been moved.',
        ],
        '500' => [
            'title' => 'Something went wrong',
            'text' => 'An unexpected error happened on our side. Try again in a moment.',
        ],
        '503' => [
            'title' => 'Back soon',
            'text' => 'Orbit is down for maintenance. Try again in a moment.',
        ],
    ],
    'loading' => 'Loading',
    'back_to_dashboard' => 'Back to dashboard',
    'log_in' => 'Log in',
    'trying_again' => 'Trying again…',
    'try_again' => 'Try again',
    'go_back' => 'Go back',
    'search_hint_before' => 'Looking for something? Press',
    'search_hint_after' => 'to search.',
    'search' => 'Search',
];
