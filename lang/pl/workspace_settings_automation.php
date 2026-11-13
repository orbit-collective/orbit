<?php

declare(strict_types=1);

return [
    'title' => 'Automatyzacja',
    'description' => 'Automatycznie reaguj na zdarzenia zgłoszeń i pull requestów z GitHub, bez niczego zaszytego na sztywno.',
    'pick_project' => 'Wybierz projekt, którego reguły automatyzacji chcesz zarządzać.',
    'no_access' => [
        'title' => 'Brak dostępu',
        'description' => 'Nie masz uprawnień do przeglądania reguł automatyzacji tego projektu.',
    ],
    'read_only' => [
        'title' => 'Dostęp tylko do odczytu',
        'description' => 'Możesz zobaczyć reguły automatyzacji tego projektu, ale nie masz uprawnień do ich zmiany.',
        'ask_admin' => 'Poproś administratora projektu',
        'ask_admin_description' => 'Tylko członkowie z uprawnieniem projects.automation.update mogą tworzyć i edytować reguły.',
    ],
    'operators' => [
        'equals' => 'jest równe',
        'not_equals' => 'jest różne od',
        'contains' => 'zawiera',
        'in' => 'jest jedną z (oddzielone przecinkami)',
    ],
    'categories' => [
        'todo' => 'Do zrobienia',
        'in_progress' => 'W toku',
        'done' => 'Zrobione',
    ],
    'subtitle' => [
        'deleted_status' => 'Usunięty status',
        'category' => 'Kategoria: :category',
        'priority' => 'Priorytet: :priority',
        'user' => 'Użytkownik #:id',
    ],
    'flow' => [
        'then_step' => 'Wtedy · Krok :step',
        'when' => 'Gdy',
        'if' => 'Jeśli',
        'choose_trigger' => 'Wybierz wyzwalacz',
        'conditions' => ':count warunek|:count warunki|:count warunków',
        'add_condition' => '+ Dodaj warunek',
        'add_action' => 'Dodaj akcję',
        'add_action_placeholder' => '+ Dodaj akcję',
    ],
    'alerts' => [
        'incomplete' => 'Reguła wymaga nazwy, wyzwalacza i co najmniej jednej akcji.',
        'saved' => 'Reguła automatyzacji została zapisana.',
        'save_failed' => 'Nie udało się zapisać reguły',
    ],
    'rules' => [
        'heading' => 'Reguły',
        'new_rule' => 'Nowa reguła',
        'empty' => 'Brak reguł.',
        'select_hint' => 'Wybierz regułę lub utwórz nową, aby zobaczyć jej przepływ.',
        'breadcrumb' => 'Automatyzacja',
        'untitled' => 'Reguła bez nazwy',
    ],
    'inspector' => [
        'trigger' => 'Wyzwalacz',
        'conditions' => 'Warunki (wszystkie muszą być spełnione)',
        'field' => 'Pole',
        'choose_field' => 'Wybierz pole',
        'operator' => 'Operator',
        'value' => 'Wartość',
        'choose_value' => 'Wybierz wartość',
        'move_to_category' => 'Przenieś do kategorii',
        'choose_category' => 'Wybierz kategorię',
        'category_hint' => 'Kategoria przenosi każde zgłoszenie do pasującego statusu jego własnego typu. Możesz też wybrać jeden konkretny status - dotyczy on tylko zgłoszeń tego typu.',
        'exact_status' => 'Konkretny status',
        'choose_exact_status' => 'Lub wybierz konkretny status',
        'priority' => 'Priorytet',
        'choose_priority' => 'Wybierz priorytet',
        'user_id' => 'ID użytkownika',
        'label_name' => 'Nazwa etykiety',
        'notification_title' => 'Tytuł powiadomienia',
        'notification_message' => 'Treść powiadomienia',
    ],
];
