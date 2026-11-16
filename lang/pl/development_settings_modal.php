<?php

declare(strict_types=1);

return [
    'title' => 'Dostosuj widok rozwoju',
    'pull_requests' => 'Pull requesty',
    'pull_requests_hint' => 'Pull requesty są czytane według ostatniej aktualizacji, od najnowszych, stronami.',
    'range' => 'Przedział czasu',
    'range_short' => [
        '7d' => '7 dni',
        '30d' => '30 dni',
        '90d' => '90 dni',
        '180d' => '6 mies.',
        '365d' => '1 rok',
        'all' => 'Całość',
    ],
    'ranges' => [
        '7d' => 'Zaktualizowane w ostatnich 7 dniach',
        '30d' => 'Zaktualizowane w ostatnich 30 dniach',
        '90d' => 'Zaktualizowane w ostatnich 90 dniach',
        '180d' => 'Zaktualizowane w ostatnich 6 miesiącach',
        '365d' => 'Zaktualizowane w ostatnim roku',
        'all' => 'Zaktualizowane kiedykolwiek',
    ],
    'limit' => 'Najwięcej pull requestów do wczytania',
    'limit_hint' => 'Najwięcej pull requestów wczytywanych dla przedziału. Większa liczba dłużej się ładuje; najnowsze i tak są pierwsze.',
    'lists' => 'Listy',
    'activity_weeks' => 'Tygodnie aktywności commitów',
    'commits_shown' => 'Liczba ostatnich commitów',
    'sections' => 'Sekcje',
    'sections_hint' => 'Ukryta sekcja nie jest pokazywana ani pobierana z GitHuba, dzięki czemu widok jest lżejszy.',
    'section' => [
        'stats' => 'Statystyki',
        'issues' => 'Zgłoszenia GitHub',
        'insights' => 'Aktywność, autorzy i języki',
        'branches' => 'Gałęzie',
        'commits' => 'Ostatnie commity',
    ],
    'reset' => 'Przywróć domyślne',
    'done' => 'Gotowe',
];
