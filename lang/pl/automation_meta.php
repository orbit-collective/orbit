<?php

declare(strict_types=1);

return [
    'fields' => [
        'status_changed' => [
            'issue_id' => "ID zgłoszenia",
            'issue_status' => "Nazwa statusu",
            'issue_previousStatus' => "Nazwa statusu (poprzednia)",
            'issue_category' => "Kategoria statusu",
            'issue_previousCategory' => "Kategoria statusu (poprzednia)",
        ],
        'pull_request' => [
            'issue_id' => "ID zgłoszenia",
            'issue_title' => "Tytuł zgłoszenia",
            'issue_status' => "Nazwa statusu",
            'issue_category' => "Kategoria statusu",
            'project_id' => "ID projektu",
            'project_name' => "Nazwa projektu",
            'repository_owner' => "Właściciel repozytorium",
            'repository_name' => "Nazwa repozytorium",
            'pullRequest_number' => "Numer pull requesta",
            'pullRequest_title' => "Tytuł pull requesta",
            'pullRequest_url' => "URL pull requesta",
            'pullRequest_sourceBranch' => "Gałąź źródłowa pull requesta",
            'pullRequest_targetBranch' => "Gałąź docelowa pull requesta",
            'pullRequest_state' => "Stan pull requesta",
        ],
    ],
];
