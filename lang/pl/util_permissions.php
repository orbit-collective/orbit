<?php

declare(strict_types=1);

return [
    'projects_view' => [
        'label' => 'Wyświetlanie projektu',
        'description' => 'Przeglądanie projektu i jego zgłoszeń.',
    ],
    'projects_create' => [
        'label' => 'Tworzenie projektów',
        'description' => 'Zakładanie nowych projektów w przestrzeni roboczej.',
    ],
    'projects_update' => [
        'label' => 'Edycja projektu',
        'description' => 'Zmiana nazwy, koloru lub konfiguracji projektu.',
    ],
    'projects_delete' => [
        'label' => 'Usuwanie projektu',
        'description' => 'Trwałe usunięcie projektu i jego danych.',
    ],
    'projects_members_view' => [
        'label' => 'Wyświetlanie członków',
        'description' => 'Podgląd osób mających dostęp do projektu.',
    ],
    'projects_members_invite' => [
        'label' => 'Zapraszanie członków',
        'description' => 'Wysyłanie zaproszeń e-mail do dołączenia do projektu.',
    ],
    'projects_members_update' => [
        'label' => 'Zarządzanie rolami członków',
        'description' => 'Zmiana podstawowej roli istniejącego członka.',
    ],
    'projects_members_delete' => [
        'label' => 'Usuwanie członków',
        'description' => 'Odebranie członkowi dostępu do projektu.',
    ],
    'projects_roles_view' => [
        'label' => 'Wyświetlanie ról',
        'description' => 'Podgląd ról niestandardowych i ich możliwości.',
    ],
    'projects_roles_create' => [
        'label' => 'Tworzenie ról',
        'description' => 'Definiowanie nowych ról niestandardowych w projekcie.',
    ],
    'projects_roles_update' => [
        'label' => 'Edycja ról',
        'description' => 'Zmiana nazw ról i ich uprawnień.',
    ],
    'projects_roles_delete' => [
        'label' => 'Usuwanie ról',
        'description' => 'Usuwanie ról niestandardowych z projektu.',
    ],
    'projects_roles_assign' => [
        'label' => 'Przypisywanie ról',
        'description' => 'Nadawanie członkom ról niestandardowych.',
    ],
    'projects_settings_view' => [
        'label' => 'Wyświetlanie ustawień',
        'description' => 'Podgląd konfiguracji na poziomie projektu.',
    ],
    'projects_settings_update' => [
        'label' => 'Edycja ustawień',
        'description' => 'Zmiana konfiguracji na poziomie projektu.',
    ],
    'projects_integrations_view' => [
        'label' => 'Wyświetlanie integracji',
        'description' => 'Podgląd integracji połączonych z projektem.',
    ],
    'projects_integrations_update' => [
        'label' => 'Zarządzanie integracjami',
        'description' => 'Łączenie, konfigurowanie i odłączanie integracji zewnętrznych.',
    ],
    'projects_automation_view' => [
        'label' => 'Wyświetlanie reguł automatyzacji',
        'description' => 'Podgląd reguł w Ustawienia → Automatyzacja projektu.',
    ],
    'projects_automation_update' => [
        'label' => 'Zarządzanie regułami automatyzacji',
        'description' => 'Tworzenie, edycja, włączanie/wyłączanie i usuwanie reguł automatyzacji.',
    ],
    'projects_github_development_create' => [
        'label' => 'Tworzenie gałęzi i pull requestów',
        'description' => 'Tworzenie gałęzi lub pull requestu GitHub z panelu Development zgłoszenia.',
    ],
    'projects_priorities_view' => [
        'label' => 'Wyświetlanie priorytetów',
        'description' => 'Podgląd skali priorytetów projektu.',
    ],
    'projects_priorities_create' => [
        'label' => 'Tworzenie priorytetów',
        'description' => 'Dodawanie poziomów priorytetu do projektu.',
    ],
    'projects_priorities_update' => [
        'label' => 'Edycja priorytetów',
        'description' => 'Zmiana nazwy, koloru, ikony, kolejności lub priorytetu domyślnego.',
    ],
    'projects_priorities_delete' => [
        'label' => 'Usuwanie priorytetów',
        'description' => 'Usuwanie poziomów priorytetu z projektu.',
    ],
    'projects_issue_types_view' => [
        'label' => 'Wyświetlanie typów zgłoszeń',
        'description' => 'Podgląd katalogu typów zgłoszeń projektu.',
    ],
    'projects_issue_types_create' => [
        'label' => 'Tworzenie typów zgłoszeń',
        'description' => 'Definiowanie nowych niestandardowych typów zgłoszeń w projekcie.',
    ],
    'projects_issue_types_update' => [
        'label' => 'Edycja typów zgłoszeń',
        'description' => 'Zmiana nazwy, koloru lub konfiguracji typów zgłoszeń, także systemowych.',
    ],
    'projects_issue_types_delete' => [
        'label' => 'Usuwanie typów zgłoszeń',
        'description' => 'Usuwanie niestandardowych typów zgłoszeń z projektu.',
    ],
    'projects_issue_types_workflow_update' => [
        'label' => 'Zarządzanie przepływami pracy',
        'description' => 'Dodawanie, usuwanie i porządkowanie statusów oraz przejść typu zgłoszenia.',
    ],
    'issues_view' => [
        'label' => 'Wyświetlanie zgłoszeń',
        'description' => 'Podgląd zgłoszeń w projekcie.',
    ],
    'issues_create' => [
        'label' => 'Tworzenie zgłoszeń',
        'description' => 'Otwieranie nowych zgłoszeń.',
    ],
    'issues_update' => [
        'label' => 'Edycja zgłoszeń',
        'description' => 'Zmiana tytułów, opisów i szczegółów zgłoszeń.',
    ],
    'issues_delete' => [
        'label' => 'Usuwanie zgłoszeń',
        'description' => 'Trwałe usuwanie zgłoszeń.',
    ],
    'issues_assign' => [
        'label' => 'Przypisywanie zgłoszeń',
        'description' => 'Przypisywanie zgłoszeń do członków.',
    ],
    'issues_change_status' => [
        'label' => 'Zmiana statusu',
        'description' => 'Przenoszenie zgłoszeń między statusami przepływu pracy.',
    ],
    'issues_change_priority' => [
        'label' => 'Zmiana priorytetu',
        'description' => 'Zmiana pilności zgłoszenia.',
    ],
    'issues_change_labels' => [
        'label' => 'Zmiana etykiet',
        'description' => 'Dodawanie lub usuwanie etykiet zgłoszenia.',
    ],
    'comments_create' => [
        'label' => 'Pisanie komentarzy',
        'description' => 'Dodawanie komentarzy do zgłoszeń.',
    ],
    'comments_update_own' => [
        'label' => 'Edycja własnych komentarzy',
        'description' => 'Edycja komentarzy napisanych przez członka.',
    ],
    'comments_update_any' => [
        'label' => 'Edycja dowolnego komentarza',
        'description' => 'Edycja komentarzy napisanych przez kogokolwiek.',
    ],
    'comments_delete_own' => [
        'label' => 'Usuwanie własnych komentarzy',
        'description' => 'Usuwanie komentarzy napisanych przez członka.',
    ],
    'comments_delete_any' => [
        'label' => 'Usuwanie dowolnego komentarza',
        'description' => 'Usuwanie komentarzy napisanych przez kogokolwiek.',
    ],
    'developer_portal_view' => [
        'label' => 'Wyświetlanie portalu deweloperskiego',
        'description' => 'Podgląd danych Developer Portal. Dostępne tylko w środowisku lokalnym.',
    ],
    'sections' => [
        'members' => 'Członkowie',
        'roles' => 'Role',
        'settings' => 'Ustawienia',
        'integrations' => 'Integracje',
        'automation' => 'Automatyzacja',
        'github' => 'GitHub',
        'priorities' => 'Priorytety',
        'issue_types' => 'Typy zgłoszeń',
        'portal' => 'Portal',
    ],
];
