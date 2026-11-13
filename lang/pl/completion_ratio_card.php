<?php

declare(strict_types=1);

return [
    'title' => 'Wskaźnik ukończenia',
    'description' => 'Status rozwiązania wszystkich zarejestrowanych zadań',
    'tier' => [
        'excellent' => 'Doskonale',
        'on_track' => 'Zgodnie z planem',
        'needs_attention' => 'Wymaga uwagi',
    ],
    'bars' => [
        'todo' => 'Do zrobienia',
        'in_progress' => 'W toku',
        'done' => 'Gotowe',
    ],
    'resolved_of' => ':done z :total rozwiązanych',
    'issues_of' => ':done z :total zgłoszeń',
    'resolved' => 'Rozwiązane',
];
