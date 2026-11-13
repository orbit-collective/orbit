<?php

declare(strict_types=1);

return [
    'widgets' => [
        'stat' => [
            'label' => 'Statystyka',
            'description' => 'Jedna liczba: wybierz, co zlicza, jak jest pokazana i jej styl',
            'options' => [
                'metric' => [
                    'label' => 'Pokazuje',
                    'values' => [
                        'projects' => 'Aktywne projekty',
                        'open_issues' => 'Otwarte zgłoszenia',
                        'critical' => 'Zadania krytyczne',
                        'resolution' => 'Wskaźnik rozwiązań',
                        'overdue' => 'Zgłoszenia po terminie',
                        'assigned' => 'Przypisane do mnie',
                        'due_soon' => 'Wkrótce termin',
                    ],
                ],
                'count' => [
                    'label' => 'Liczba',
                    'values' => [
                        'open' => 'Otwarte',
                        'todo' => 'Do zrobienia',
                        'in_progress' => 'W toku',
                        'done' => 'Zrobione',
                        'all' => 'Wszystkie',
                    ],
                ],
                'show' => [
                    'label' => 'Jako',
                    'values' => [
                        'value' => 'Liczba',
                        'fraction' => 'Część / całość',
                        'percent' => 'Procent',
                    ],
                ],
                'color' => [
                    'label' => 'Kolor',
                    'values' => [
                        'auto' => 'Automatyczny',
                    ],
                ],
                'icon' => [
                    'label' => 'Ikona',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'description' => [
                    'label' => 'Opis',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
            ],
        ],
        'trend' => [
            'label' => 'Trend produktywności',
            'description' => 'Zgłoszenia utworzone i rozwiązane w czasie',
            'options' => [
                'header' => [
                    'label' => 'Tytuł',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'grid' => [
                    'label' => 'Linie siatki',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'values' => [
                    'label' => 'Wartości',
                    'values' => [
                        'hover' => 'Po najechaniu',
                        'always' => 'Zawsze',
                    ],
                ],
                'today' => [
                    'label' => 'Wyróżnij dzisiaj',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'color' => [
                    'label' => 'Kolor',
                ],
            ],
        ],
        'completion' => [
            'label' => 'Wskaźnik ukończenia',
            'description' => 'Do zrobienia, w toku i zrobione w jednym rzucie oka',
            'options' => [
                'header' => [
                    'label' => 'Tytuł',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'tier' => [
                    'label' => 'Etykieta statusu',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
            ],
        ],
        'priority_breakdown' => [
            'label' => 'Podział według priorytetu',
            'description' => 'Twoje zgłoszenia pogrupowane według priorytetu',
            'options' => [
                'header' => [
                    'label' => 'Tytuł',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'noPriority' => [
                    'label' => 'Brak priorytetu',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'percent' => [
                    'label' => 'Procenty',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'sort' => [
                    'label' => 'Kolejność',
                    'values' => [
                        'priority' => 'Według priorytetu',
                        'count' => 'Według liczby',
                    ],
                ],
            ],
        ],
        'activity' => [
            'label' => 'Ostatnia aktywność',
            'description' => 'Najnowsze zmiany w twoich projektach',
            'options' => [
                'header' => [
                    'label' => 'Tytuł',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'pagination' => [
                    'label' => 'Paginacja',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
            ],
        ],
        'projects' => [
            'label' => 'Katalog projektów',
            'description' => 'Twoje projekty wraz z postępami',
            'options' => [
                'limit' => [
                    'label' => 'Wyświetlane projekty',
                ],
                'sort' => [
                    'label' => 'Kolejność',
                    'values' => [
                        'latest' => 'Najnowsze',
                        'name' => 'Nazwa',
                        'progress' => 'Postęp',
                        'issues' => 'Zgłoszenia',
                    ],
                ],
                'header' => [
                    'label' => 'Tytuł',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'viewAll' => [
                    'label' => 'Link „Zobacz wszystko”',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
            ],
        ],
        'my_issues' => [
            'label' => 'Moje zgłoszenia',
            'description' => 'Otwarte zgłoszenia przypisane do ciebie',
            'options' => [
                'limit' => [
                    'label' => 'Wyświetlane zgłoszenia',
                ],
                'sort' => [
                    'label' => 'Kolejność',
                    'values' => [
                        'priority' => 'Priorytet',
                        'due' => 'Termin',
                        'updated' => 'Ostatnia aktualizacja',
                    ],
                ],
                'header' => [
                    'label' => 'Tytuł',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'type' => [
                    'label' => 'Typ zgłoszenia',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'project' => [
                    'label' => 'Projekt',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'priority' => [
                    'label' => 'Priorytet',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'due' => [
                    'label' => 'Termin',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
            ],
        ],
        'deadlines' => [
            'label' => 'Nadchodzące terminy',
            'description' => 'Co ma termin w najbliższym czasie i co jest po terminie',
            'options' => [
                'scope' => [
                    'label' => 'Czyje zgłoszenia',
                    'values' => [
                        'mine' => 'Przypisane do mnie',
                        'all' => 'Wszystkie projekty',
                    ],
                ],
                'range' => [
                    'label' => 'Wybiegnięcie w przód',
                    'values' => [
                        '7' => '7 dni',
                        '14' => '14 dni',
                        '30' => '30 dni',
                    ],
                ],
                'overdue' => [
                    'label' => 'Zgłoszenia po terminie',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'limit' => [
                    'label' => 'Wyświetlane zgłoszenia',
                ],
                'header' => [
                    'label' => 'Tytuł',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
            ],
        ],
        'types_breakdown' => [
            'label' => 'Typy zgłoszeń',
            'description' => 'Twoje zgłoszenia pogrupowane według typu',
            'options' => [
                'header' => [
                    'label' => 'Tytuł',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'percent' => [
                    'label' => 'Procenty',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'sort' => [
                    'label' => 'Kolejność',
                    'values' => [
                        'count' => 'Według liczby',
                        'name' => 'Według nazwy',
                    ],
                ],
            ],
        ],
        'week_summary' => [
            'label' => 'Podsumowanie tygodnia',
            'description' => 'Ten tydzień w jednym rzucie oka',
            'options' => [
                'header' => [
                    'label' => 'Tytuł',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'average' => [
                    'label' => 'Średnia dzienna',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'best' => [
                    'label' => 'Najlepszy dzień',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'color' => [
                    'label' => 'Kolor',
                ],
            ],
        ],
        'quick_actions' => [
            'label' => 'Szybkie akcje',
            'description' => 'Skróty do tego, co robisz najczęściej',
            'options' => [
                'header' => [
                    'label' => 'Tytuł',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'labels' => [
                    'label' => 'Etykiety',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'color' => [
                    'label' => 'Kolor',
                ],
                'newProject' => [
                    'label' => 'Nowy projekt',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'search' => [
                    'label' => 'Wyszukiwanie',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'projects' => [
                    'label' => 'Projekty',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'notifications' => [
                    'label' => 'Powiadomienia',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'editDashboard' => [
                    'label' => 'Edytuj pulpit',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'shortcuts' => [
                    'label' => 'Skróty klawiszowe',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
            ],
        ],
        'greeting' => [
            'label' => 'Powitanie',
            'description' => 'Powitanie z twoim dniem w liczbach',
            'options' => [
                'name' => [
                    'label' => 'Twoje imię',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'date' => [
                    'label' => 'Data',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'summary' => [
                    'label' => 'Dzień w liczbach',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'icon' => [
                    'label' => 'Ikona pory dnia',
                    'values' => [
                        'on' => 'Pokaż',
                        'off' => 'Ukryj',
                    ],
                ],
                'color' => [
                    'label' => 'Kolor',
                ],
            ],
        ],
    ],
    'variants' => [
        'default' => 'Domyślny',
        'vivid' => 'Żywy',
        'accent' => 'Akcent',
        'glass' => 'Szkło',
        'outline' => 'Kontur',
        'bars' => 'Słupki',
        'line' => 'Linia',
        'area' => 'Obszar',
        'ring' => 'Pierścień',
        'stacked' => 'Skumulowany',
        'bar' => 'Pasek',
        'list' => 'Lista',
        'donut' => 'Pierścieniowy',
        'feed' => 'Strumień',
        'compact' => 'Kompaktowy',
        'cards' => 'Karty',
        'grid' => 'Siatka',
        'timeline' => 'Oś czasu',
        'week' => 'Tydzień',
        'numbers' => 'Liczby',
        'sparkline' => 'Wykres liniowy',
        'banner' => 'Baner',
        'minimal' => 'Minimalny',
    ],
    'widths' => [
        '120' => 'Pełna',
    ],
];
