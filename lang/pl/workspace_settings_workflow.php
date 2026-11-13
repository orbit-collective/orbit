<?php

declare(strict_types=1);

return [
    'categories' => [
        'todo' => 'Do zrobienia',
        'in_progress' => 'W toku',
        'done' => 'Gotowe',
    ],
    'title' => 'Przepływ pracy: :type',
    'reorder_aria' => 'Zmień kolejność: :name',
    'start' => 'Start',
    'no_transitions' => 'Brak przejść',
    'transitions_count' => '{1} :count przejście|[2,4] :count przejścia|[5,*] :count przejść',
    'make_initial_title' => 'Ustaw jako status początkowy',
    'make_initial_aria' => 'Ustaw status :name jako początkowy',
    'delete_title' => 'Usuń status',
    'delete_aria' => 'Usuń :name',
    'add_error' => 'Nie udało się dodać tego statusu.',
    'reorder_error' => 'Nie udało się zmienić kolejności statusów.',
    'initial_error' => 'Nie udało się zmienić statusu początkowego.',
    'delete_error' => 'Nie udało się usunąć tego statusu. Upewnij się, że żadne zgłoszenie go nie używa i że pozostaje co najmniej jeden status.',
    'flow' => 'Przepływ',
    'flow_description_edit' => 'Etapy, przez które przechodzi zgłoszenie tego typu. Przeciągnij status, aby zmienić kolejność przepływu.',
    'flow_description' => 'Etapy, przez które przechodzi zgłoszenie tego typu.',
    'new_status_placeholder' => 'Nazwa nowego statusu',
    'category' => 'Kategoria',
    'add_status' => 'Dodaj status',
    'use_color' => 'Użyj koloru :color',
    'transitions' => 'Przejścia',
    'transitions_description' => 'Dla każdego statusu wybierz, do których innych statusów zgłoszenie może przejść bezpośrednio.',
    'from' => 'Z',
    'allow_transition' => 'Zezwól na przejście z :from do :to',
];
