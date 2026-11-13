<?php

declare(strict_types=1);

return [
    'group_by' => [
        'priority' => 'Priorytet',
        'status' => 'Status',
    ],
    'no_priority' => [
        'label' => 'Brak priorytetu',
        'hint' => 'Jeszcze bez priorytetu',
    ],
    'status_columns' => [
        'todo' => [
            'label' => 'Do zrobienia',
            'hint' => 'Jeszcze nie rozpoczęte',
        ],
        'in_progress' => [
            'label' => 'W toku',
            'hint' => 'W trakcie realizacji',
        ],
        'done' => [
            'label' => 'Gotowe',
            'hint' => 'Ukończone',
        ],
    ],
    'update_failed' => 'Nie udało się zaktualizować pola zgłoszenia: :field',
    'fields' => [
        'priority' => 'priorytet',
        'status' => 'status',
    ],
    'categories' => [
        'todo' => 'do zrobienia',
        'in_progress' => 'w toku',
        'done' => 'gotowe',
    ],
    'no_reachable_status' => 'Ten typ zgłoszenia nie ma dostępnego statusu: :status',
];
