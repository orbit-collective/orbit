<?php

declare(strict_types=1);

return [
    'triggers' => [
        'issue_status_changed' => 'Zmieniono status zgłoszenia',
        'github_pull_request_opened' => 'Otwarto pull request na GitHubie',
        'github_pull_request_reopened' => 'Ponownie otwarto pull request na GitHubie',
        'github_pull_request_closed' => 'Zamknięto pull request na GitHubie',
        'github_pull_request_merged' => 'Scalono pull request na GitHubie',
        'github_pull_request_synchronized' => 'Zaktualizowano pull request na GitHubie',
    ],
    'actions' => [
        'change_status' => 'Zmień status',
        'change_priority' => 'Zmień priorytet',
        'assign_user' => 'Przypisz użytkownika',
        'add_label' => 'Dodaj etykietę',
        'remove_label' => 'Usuń etykietę',
        'send_notification' => 'Wyślij powiadomienie',
    ],
];
