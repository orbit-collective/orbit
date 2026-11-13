<?php

declare(strict_types=1);

return [
    'on' => 'Wł.',
    'off' => 'Wył.',
    'this_browser_only' => 'Dotyczy tylko tej przeglądarki.',

    'browser' => [
        'denied_alert' => 'Przeglądarka nie zezwoliła na powiadomienia. Zezwól na nie dla tej witryny w ustawieniach przeglądarki i spróbuj ponownie.',
        'title' => 'Powiadomienia w przeglądarce',
        'description' => 'Otrzymuj powiadomienie systemowe, gdy pojawi się coś nowego, a Orbit jest w karcie w tle.',
        'row_title' => 'Pokazuj powiadomienia na tym urządzeniu',
        'unsupported' => 'Ta przeglądarka nie obsługuje powiadomień.',
        'blocked' => 'Powiadomienia są zablokowane dla tej witryny w ustawieniach przeglądarki.',
        'toggle_label' => 'Pokazuj powiadomienia w przeglądarce',
    ],

    'preferences' => [
        'issue_view' => [
            'title' => 'Domyślny widok zgłoszeń',
            'description' => 'Wybierz, jak domyślnie otwierają się zgłoszenia w Twoich projektach.',
            'summary' => 'Widok: :view',
            'views' => [
                'List' => [
                    'name' => 'Lista',
                    'description' => 'Gęsta, sortowalna tabela wszystkich zgłoszeń.',
                ],
                'Board' => [
                    'name' => 'Tablica',
                    'description' => 'Kolumny kanban pogrupowane według statusu lub priorytetu.',
                ],
                'Calendar' => [
                    'name' => 'Kalendarz',
                    'description' => 'Zgłoszenia rozmieszczone według terminów.',
                ],
                'Activity' => [
                    'name' => 'Aktywność',
                    'description' => 'Chronologiczny strumień całej aktywności w zgłoszeniach.',
                ],
            ],
        ],
        'theme' => [
            'title' => 'Motyw interfejsu',
            'description' => 'Wybierz, jak Orbit ma wyświetlać kolory na Twoim koncie.',
            'options' => [
                'dark' => [
                    'label' => 'Ciemny',
                    'subtitle' => 'Ciemny interfejs Orbit',
                ],
                'light' => [
                    'label' => 'Jasny',
                    'subtitle' => 'Jasny tryb przestrzeni roboczej',
                ],
                'system' => [
                    'label' => 'Zgodny z systemem',
                    'subtitle' => 'Zgodnie z ustawieniem systemu',
                ],
            ],
        ],
        'accent' => [
            'title' => 'Kolor akcentu',
            'description' => 'Wybierz akcent używany w przyciskach, linkach i wyróżnieniach - jeden z kolorów projektu lub dowolny własny kolor.',
        ],
        'language' => [
            'title' => 'Język',
            'description' => 'Wybierz język, w którym wyświetlany jest Orbit. Zmiana działa od razu, tutaj i w menu paska bocznego.',
            'options' => [
                'en' => 'Angielski',
                'pl' => 'Polski',
            ],
        ],
        'reduced_motion' => [
            'title' => 'Ograniczone animacje',
            'description' => 'Wyłącz animacje wejścia, najechania i przejść w całym Orbit. Wszystko pojawia się natychmiast.',
        ],
    ],

    'avatar' => [
        'library' => 'Biblioteka awatarów',
        'library_description' => 'Wybierz jeden z gotowych awatarów zamiast przesyłać zdjęcie.',
        'use_face' => 'Użyj awatara :face',
        'invalid_type' => 'Nieprawidłowy obraz. Prześlij obraz JPEG, PNG lub GIF.',
        'too_large' => 'Obraz musi być mniejszy niż 5 MB.',
        'uploaded' => 'Awatar został przesłany.',
        'invalid_file' => 'Nieprawidłowy plik obrazu.',
        'load_failed' => 'Nie udało się wczytać obrazu. Plik może być uszkodzony.',
        'read_failed' => 'Nie udało się odczytać obrazu.',
        'reset_failed' => 'Nie udało się zresetować awatara.',
        'choose_aria' => 'Wybierz awatar z biblioteki',
        'preview_alt' => 'Podgląd awatara',
        'upload' => 'Prześlij nowe zdjęcie',
        'choose' => 'Wybierz z biblioteki',
        'reset' => 'Przywróć domyślny',
        'saving' => 'Zapisywanie...',
    ],

    'delete_account' => [
        'title' => 'Usuń konto',
        'deleted' => 'Konto zostało usunięte.',
        'failed' => 'Nie udało się usunąć konta.',
        'warning' => 'Ta operacja trwale usuwa Twoje konto, profil i wszystkie powiązane dane. Nie można jej cofnąć.',
        'consequence_access' => 'Natychmiast stracisz dostęp do wszystkich przestrzeni roboczych.',
        'consequence_content' => 'Zgłoszenia i komentarze, których jesteś autorem, pozostaną przypisane do usuniętego użytkownika.',
        'type_prefix' => 'Wpisz',
        'type_suffix' => 'aby potwierdzić',
    ],

    'export' => [
        'title' => 'Eksport danych',
        'description' => 'Wygeneruj przenośne kopie danych swojego konta.',
        'full_title' => 'Pełny eksport konta',
        'full_description' => 'Obejmuje profil, preferencje i aktywność.',
        'full_button' => 'Poproś o eksport',
        'log_title' => 'Eksport dziennika aktywności',
        'log_description' => 'Pobierz archiwum zdarzeń aktywności w formacie do odczytu maszynowego.',
        'log_button' => 'Pobierz CSV',
        'privacy_title' => 'Prywatność',
        'privacy_description' => 'Kontroluj przechowywanie i usuwanie danych osobowych konta.',
        'delete_description' => 'Trwale usuń swoje konto Orbit i powiązane treści.',
    ],

    'cleanup' => [
        'frequency_options' => [
            'daily' => 'Codziennie',
            'weekly' => 'Co tydzień',
            'monthly' => 'Co miesiąc',
        ],
        'age_days' => ':days dni',
        'dont_delete' => 'Nie usuwaj',
        'saved' => 'Harmonogram czyszczenia został zapisany.',
        'save_failed' => 'Nie udało się zapisać harmonogramu czyszczenia.',
        'purge_failed' => 'Nie udało się usunąć wybranych danych.',
        'last_ran' => 'Ostatnio uruchomiono :time temu.',
        'not_run' => 'Jeszcze nie uruchomiono.',
        'title' => 'Automatyczne czyszczenie',
        'description' => 'Utrzymuj porządek w skrzynce i historii, usuwając stare elementy według harmonogramu.',
        'run_auto' => 'Uruchamiaj czyszczenie automatycznie',
        'how_often' => 'Jak często',
        'how_often_description' => 'Czyszczenie uruchamia się najwyżej raz w danym okresie.',
        'frequency' => 'Częstotliwość',
        'notifications_older' => 'Usuwaj powiadomienia starsze niż',
        'notification_age' => 'Wiek powiadomień',
        'keep_unread' => 'Zachowuj nieprzeczytane powiadomienia',
        'keep_unread_description' => 'Usuwane są tylko powiadomienia, które już przeczytano.',
        'activity_older' => 'Usuwaj historię aktywności starszą niż',
        'activity_older_description' => 'Usuwa Twoje własne wpisy z dziennika aktywności.',
        'activity_age' => 'Wiek aktywności',
        'saving' => 'Zapisywanie...',
        'save_schedule' => 'Zapisz harmonogram',
        'now_title' => 'Wyczyść teraz',
        'now_description' => 'Usuń stare elementy od razu, niezależnie od harmonogramu.',
        'purge_notifications' => 'Usuń stare powiadomienia',
        'unread_kept' => 'Nieprzeczytane powiadomienia są zachowywane.',
        'unread_deleted' => 'Nieprzeczytane powiadomienia również są usuwane.',
        'purge_activity' => 'Usuń starą historię aktywności',
        'purge_activity_description' => 'Usuwa Twoje własne wpisy z dziennika aktywności.',
        'older_than' => 'Starsze niż',
    ],

    'notifications' => [
        'updated' => 'Ustawienia powiadomień zostały zaktualizowane.',
        'update_failed' => 'Nie udało się zaktualizować ustawień powiadomień.',
        'types_summary' => ':count typów',
        'title' => 'Typy powiadomień',
        'description' => 'Wybierz, jaka aktywność ma Cię powiadamiać i gdzie.',
        'column_type' => 'Typ',
        'column_in_app' => 'W aplikacji',
        'column_email' => 'E-mail',
        'types' => [
            'issue_assigned' => [
                'title' => 'Przypisane zgłoszenia',
                'description' => 'Gdy zgłoszenie zostanie do Ciebie przypisane lub przypisanie zostanie cofnięte.',
            ],
            'issue_commented' => [
                'title' => 'Komentarze',
                'description' => 'Gdy zgłoszenie, w którym uczestniczysz, zostanie skomentowane.',
            ],
            'issue_mentioned' => [
                'title' => 'Wzmianki',
                'description' => 'Gdy ktoś wspomni o Tobie w komentarzu.',
            ],
            'issue_status_changed' => [
                'title' => 'Zmiany statusu',
                'description' => 'Gdy status zgłoszenia, w którym uczestniczysz, zostanie zmieniony.',
            ],
            'issue_priority_changed' => [
                'title' => 'Zmiany priorytetu',
                'description' => 'Gdy priorytet zgłoszenia, w którym uczestniczysz, zostanie zmieniony.',
            ],
            'issue_labels_changed' => [
                'title' => 'Zmiany etykiet',
                'description' => 'Gdy zmienią się etykiety zgłoszenia, w którym uczestniczysz.',
            ],
            'issue_dates_changed' => [
                'title' => 'Zmiany harmonogramu',
                'description' => 'Gdy zmieni się data rozpoczęcia lub termin zgłoszenia, w którym uczestniczysz.',
            ],
            'issue_updated' => [
                'title' => 'Inne zmiany zgłoszeń',
                'description' => 'Gdy zmieni się jakikolwiek inny szczegół zgłoszenia, w którym uczestniczysz.',
            ],
            'project_invited' => [
                'title' => 'Zaproszenia do projektów',
                'description' => 'Gdy zostaniesz zaproszony do nowego projektu.',
            ],
            'integration_activity' => [
                'title' => 'Aktywność integracji',
                'description' => 'Gdy rozpoczęty przez Ciebie import (np. z Jiry) zakończy się lub się nie powiedzie.',
            ],
        ],
    ],

    'password' => [
        'must_differ' => 'Nowe hasło musi różnić się od obecnego.',
        'mismatch' => 'Hasła nie są takie same.',
        'locked' => 'Zbyt wiele prób. Spróbuj ponownie za :time.',
        'current' => 'Obecne hasło',
        'new' => 'Nowe hasło',
        'confirm' => 'Potwierdź nowe hasło',
        'hint' => 'Użyj co najmniej 8 znaków, łącząc litery, cyfry i symbole.',
        'update' => 'Zaktualizuj hasło',
        'set' => 'Ustaw hasło',
    ],

    'preview' => [
        'sidebar' => 'Pasek boczny',
        'comment' => 'Komentarz',
        'issue_row' => 'Wiersz zgłoszenia',
        'time_ago' => '2 min temu',
        'reply' => 'Odpowiedz',
    ],

    'profile' => [
        'name_placeholder' => 'Twoje imię',
        'avatar_reset' => 'Przywrócono domyślny awatar.',
        'avatar_updated' => 'Awatar został zaktualizowany.',
        'avatar_update_failed' => 'Nie udało się zaktualizować awatara.',
        'avatar_load_failed' => 'Nie udało się wczytać wybranego awatara.',
        'title' => 'Profil',
        'description' => 'Zarządzaj swoimi danymi osobowymi i tym, jak widzą Cię współpracownicy.',
        'username' => 'Nazwa użytkownika',
        'username_description' => 'Współpracownicy zobaczą tę nazwę i będą mogli wspomnieć o Tobie przez @.',
        'saving' => 'Zapisywanie...',
        'unsaved' => 'Niezapisane zmiany',
        'saved' => 'Zmiany zapisane',
        'photo' => 'Zdjęcie profilowe',
        'photo_description' => 'To zdjęcie będzie widoczne dla innych w całym Orbit.',
        'preview_title' => 'Podgląd na żywo',
        'preview_description' => 'Aktualizuje się od razu podczas edycji zdjęcia i nazwy.',
    ],

    'security' => [
        'expiry_updated' => 'Czas wygaśnięcia sesji został zaktualizowany.',
        'expiry_failed' => 'Nie udało się zaktualizować czasu wygaśnięcia sesji.',
        'unlinked' => 'Konto GitHub zostało odłączone.',
        'unlink_failed' => 'Nie udało się odłączyć konta GitHub.',
        'github_summary' => 'GitHub @:username',
        'not_linked' => 'Niepołączone',
        'accounts_title' => 'Połączone konta',
        'accounts_description' => 'Loguj się szybciej, łącząc zewnętrzne konto.',
        'github_linked' => 'Połączono jako @:username. Możesz też logować się tym kontem GitHub.',
        'github_unlinked' => 'Połącz konto GitHub, aby się nim logować oraz tworzyć gałęzie lub pull requesty ze zgłoszenia.',
        'unlink_needs_password' => 'Najpierw ustaw hasło, aby po odłączeniu nadal móc się zalogować',
        'unlinking' => 'Odłączanie...',
        'unlink' => 'Odłącz',
        'link_github' => 'Połącz GitHub',
        'password_title' => 'Hasło',
        'password_description' => 'Zmień hasło lub wyślij sobie link do jego zresetowania.',
        'password_description_set' => 'Ustaw hasło, aby móc logować się także bez GitHub.',
        'sessions_count' => '{1} :count sesja|[2,4] :count sesje|[5,*] :count sesji',
        'sessions_title' => 'Aktywne sesje',
        'sessions_description' => 'Przeglądaj i unieważniaj urządzenia, na których jesteś zalogowany.',
        'expiry_title' => 'Wygasanie sesji',
        'expiry_description' => 'Wybierz, jak długo pozostajesz zalogowany, zanim trzeba będzie zalogować się ponownie.',
        'timeout' => [
            '1-hour' => [
                'label' => '1 godzina',
                'description' => 'Najbezpieczniej. Częste ponowne logowanie.',
            ],
            '8-hours' => [
                'label' => '8 godzin',
                'description' => 'Wyważone na typowy dzień pracy.',
            ],
            '24-hours' => [
                'label' => '24 godziny',
                'description' => 'Pozostań zalogowany przez cały dzień.',
            ],
            '7-days' => [
                'label' => '7 dni',
                'description' => 'Najwygodniej. Logowanie rzadziej.',
            ],
        ],
        'delete_description' => 'Trwale usuń swoje konto Orbit i powiązane dane.',
        'delete_row_title' => 'Usuń to konto',
        'delete_row_description' => 'Ta operacja jest trwała i nie można jej cofnąć.',
    ],

    'sessions' => [
        'signed_out' => 'Wylogowano z ":ip".',
        'sign_out_failed' => 'Nie udało się wylogować z tej sesji.',
        'signed_out_others' => 'Wylogowano ze wszystkich pozostałych sesji.',
        'sign_out_others_failed' => 'Nie udało się wylogować z pozostałych sesji.',
        'active' => 'Aktywna :time temu · :agent',
        'this_device' => 'To urządzenie',
        'revoking' => 'Unieważnianie…',
        'revoke' => 'Unieważnij',
        'signing_out' => 'Wylogowywanie…',
        'sign_out_others' => 'Wyloguj ze wszystkich pozostałych sesji',
    ],
];
