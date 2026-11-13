<?php

declare(strict_types=1);

return [
    'defaults' => [
        'title' => 'Domyślne ustawienia dokumentacji',
        'description' => 'Ustaw domyślną strukturę i dostęp do dokumentów przestrzeni roboczej.',
        'access_level' => 'Domyślny poziom dostępu',
        'members_only' => 'Tylko członkowie',
        'workspace_and_guests' => 'Przestrzeń robocza i goście',
        'new_folder' => 'Nowy folder',
        'new_template' => 'Nowy szablon',
        'structure_preview' => 'Podgląd struktury dokumentów',
        'folder_docs' => ':name · :count dok.',
    ],
    'knowledge' => [
        'title' => 'Zarządzanie wiedzą',
        'description' => 'Popraw organizację i długoterminową wyszukiwalność.',
        'indexing' => [
            'title' => 'Indeksowanie treści',
            'description' => 'Na bieżąco indeksuj dokumenty przestrzeni roboczej dla szybkiego wyszukiwania.',
        ],
        'retention' => [
            'title' => 'Polityka retencji',
            'description' => 'Archiwizuj nieaktualne dokumenty po wybranym okresie nieaktywności.',
            'value' => '180 dni',
        ],
    ],
];
