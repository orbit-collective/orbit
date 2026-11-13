<?php

declare(strict_types=1);

return [
    'discord' => [
        'vendor' => "Od Discord Inc.",
        'description' => "Publikuj aktywność w zgłoszeniach i projektach bezpośrednio na swoim serwerze Discord.",
        'overview' => "Połącz serwer Discord, aby odzwierciedlać aktywność z Orbit — nowe zgłoszenia, zmiany statusu i komentarze — na kanałach, które Twój zespół już obserwuje, tak aby nikt nie musiał przełączać kontekstu, by być na bieżąco.\n\n**Co zyskujesz:**\n- Aktywność zgłoszeń i komentarzy w czasie rzeczywistym na wybranym kanale\n- Wzmianki, które mapują użytkowników Orbit na ich nazwy w Discordzie\n- Koniec ze sprawdzaniem dwóch miejsc w poszukiwaniu tej samej aktualizacji",
        'preview' => [
            'p1' => [
                'title' => "Zgłoszenie #128 przypisane do Jane Cooper",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Nowy komentarz do „Fix login crash”",
                'time' => "2 min temu",
            ],
        ],
        'options' => [
            'issue-activity' => [
                'title' => "Aktywność zgłoszeń",
                'description' => "Opublikuj wiadomość, gdy zgłoszenie zostanie utworzone, przypisane lub rozwiązane.",
            ],
            'comment-activity' => [
                'title' => "Aktywność komentarzy",
                'description' => "Opublikuj wiadomość, gdy ktoś doda komentarz.",
            ],
        ],
    ],
    'slack' => [
        'vendor' => "Od Slack Technologies",
        'description' => "Wysyłaj powiadomienia i aktualizacje bezpośrednio na kanały zespołu.",
        'overview' => "Połącz Slacka, aby kierować powiadomienia Orbit na właściwe kanały, dzięki czemu zespoły mogą reagować na aktywność w projektach bez opuszczania dotychczasowego sposobu pracy.\n\n**Co zyskujesz:**\n- Kierowanie na poziomie kanału dla każdego projektu\n- Odpowiedzi w wątkach zsynchronizowane z komentarzami Orbit\n- Polecenie slash do tworzenia zgłoszenia bez opuszczania Slacka",
        'preview' => [
            'p1' => [
                'title' => "Zgłoszenie #128 przypisane do Jane Cooper",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Nowy komentarz do „Fix login crash”",
                'time' => "2 min temu",
            ],
        ],
        'options' => [
            'issue-activity' => [
                'title' => "Aktywność zgłoszeń",
                'description' => "Opublikuj wiadomość, gdy zgłoszenie zostanie utworzone, przypisane lub rozwiązane.",
            ],
            'comment-activity' => [
                'title' => "Aktywność komentarzy",
                'description' => "Opublikuj wiadomość, gdy ktoś doda komentarz.",
            ],
        ],
    ],
    'microsoft-teams' => [
        'vendor' => "Od Microsoft Corporation",
        'description' => "Publikuj aktywność i aktualizacje plików na kanałach Teams.",
        'overview' => "Połącz Microsoft Teams, aby przenieść aktywność w zgłoszeniach, komentarze i załączniki na kanały, na których Twoja organizacja polega podczas codziennych spotkań i przeglądów.\n\n**Co zyskujesz:**\n- Powiadomienia w postaci kart adaptacyjnych o aktywności zgłoszeń\n- Kierowanie na poziomie kanału dla każdego projektu\n- Wzmianki @ mapowane na tożsamości w Teams",
        'preview' => [
            'p1' => [
                'title' => "Zgłoszenie #128 przypisane do Jane Cooper",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Nowy komentarz do „Fix login crash”",
                'time' => "2 min temu",
            ],
        ],
        'options' => [
            'issue-activity' => [
                'title' => "Aktywność zgłoszeń",
                'description' => "Opublikuj kartę adaptacyjną, gdy zgłoszenie zostanie utworzone lub zaktualizowane.",
            ],
            'comment-activity' => [
                'title' => "Aktywność komentarzy",
                'description' => "Opublikuj wiadomość, gdy ktoś doda komentarz.",
            ],
        ],
    ],
    'zoom' => [
        'vendor' => "Od Zoom Communications",
        'description' => "Załączaj nagrania ze spotkań i notatki do powiązanych zgłoszeń.",
        'overview' => "Połącz Zoom, aby powiązać nagrania spotkań, transkrypcje i zaplanowane rozmowy bezpośrednio ze zgłoszeniami i projektami, których dotyczą, tak aby kontekst nie ginął w czyimś kalendarzu.\n\n**Co zyskujesz:**\n- Załączanie linku do nagrania do dowolnego zgłoszenia\n- Automatycznie generowane podsumowanie notatek ze spotkania\n- Planowanie jednym kliknięciem z poziomu zgłoszenia",
        'preview' => [
            'p1' => [
                'title' => "Nagranie załączone do zgłoszenia #64",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Spotkanie zaplanowane: „Sprint planning”",
                'time' => "1 godz. temu",
            ],
        ],
        'options' => [
            'meeting-links' => [
                'title' => "Linki do spotkań",
                'description' => "Załącz link do spotkania Zoom do zgłoszenia.",
            ],
            'recording-sync' => [
                'title' => "Synchronizacja nagrań",
                'description' => "Synchronizuj linki do nagrań ze zgłoszeniem po zakończeniu rozmowy.",
            ],
        ],
    ],
    'telegram' => [
        'vendor' => "Od Telegram FZ-LLC",
        'description' => "Otrzymuj natychmiastowe alerty o zgłoszeniach i komentarzach na czacie Telegram.",
        'overview' => "Połącz bota Telegram ze swoją przestrzenią roboczą, aby otrzymywać natychmiastowe alerty o aktywności na czacie grupowym lub w wiadomości prywatnej — lekka alternatywa dla zespołów, które żyją w Telegramie.\n\n**Co zyskujesz:**\n- Natychmiastowe dostarczanie przez dedykowanego bota\n- Kierowanie na poziomie czatu dla różnych projektów\n- Działa na czatach grupowych i kanałach",
        'preview' => [
            'p1' => [
                'title' => "Zgłoszenie #128 przypisane do Jane Cooper",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Nowy komentarz do „Fix login crash”",
                'time' => "2 min temu",
            ],
        ],
        'options' => [
            'issue-activity' => [
                'title' => "Aktywność zgłoszeń",
                'description' => "Wyślij wiadomość, gdy zgłoszenie zostanie utworzone, przypisane lub rozwiązane.",
            ],
            'comment-activity' => [
                'title' => "Aktywność komentarzy",
                'description' => "Wyślij wiadomość, gdy ktoś doda komentarz.",
            ],
        ],
    ],
    'github' => [
        'vendor' => "Od GitHub, Inc.",
        'description' => "Powiąż pull request ze zgłoszeniem Orbit i otrzymaj komentarz bota potwierdzający powiązanie.",
        'overview' => "Połącz repozytorium GitHub, aby powiązać pull request ze zgłoszeniem Orbit: dodaj ukryty znacznik `<!-- orbit-issue:ID -->` do opisu pull requesta, a Orbit powiąże go automatycznie i odpowie komentarzem z potwierdzeniem.\n\n**Co zyskujesz:**\n- Automatyczne powiązanie pull requesta ze zgłoszeniem Orbit, do którego się odwołuje\n- Komentarz bota potwierdzający powiązanie w pull requeście\n- Powiązany pull request widoczny w zgłoszeniu Orbit",
        'preview' => [
            'p1' => [
                'title' => "PR #283 powiązany ze zgłoszeniem #12",
                'time' => "Przed chwilą",
            ],
        ],
    ],
    'gitlab' => [
        'vendor' => "Od GitLab Inc.",
        'description' => "Synchronizuj merge requesty i status pipeline z powiązanymi zgłoszeniami.",
        'overview' => "Połącz projekt GitLab, aby powiązać merge requesty i pipeline ze zgłoszeniami Orbit, dzięki czemu status dostarczania jest widoczny bez przełączania narzędzi.\n\n**Co zyskujesz:**\n- Automatyczne powiązanie zgłoszeń z opisów commitów i MR\n- Zmiany statusu po scaleniu powiązanego MR\n- Status pipeline widoczny bezpośrednio w zgłoszeniu",
        'preview' => [
            'p1' => [
                'title' => "MR !18 scalony — zgłoszenie #34 oznaczone jako zrobione",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Pipeline zakończony powodzeniem dla zgłoszenia #34",
                'time' => "10 min temu",
            ],
        ],
        'options' => [
            'link-commits' => [
                'title' => "Powiązanie commitów",
                'description' => "Wykrywaj odwołania do zgłoszeń w komunikatach commitów.",
            ],
            'pipeline-status' => [
                'title' => "Status pipeline",
                'description' => "Pokaż najnowszy wynik pipeline na powiązanych zgłoszeniach.",
            ],
        ],
    ],
    'bitbucket' => [
        'vendor' => "Od Atlassian",
        'description' => "Powiąż commity i pull requesty z repozytoriów Bitbucket.",
        'overview' => "Połącz repozytorium Bitbucket, aby powiązać commity i pull requesty ze zgłoszeniami Orbit, dzięki czemu status dostarczania jest widoczny w jednym źródle prawdy.\n\n**Co zyskujesz:**\n- Automatyczne powiązanie zgłoszeń z komunikatów commitów\n- Zmiany statusu po scaleniu powiązanego PR\n- Zsynchronizowana historia aktywności między Bitbucket a Orbit",
        'preview' => [
            'p1' => [
                'title' => "PR #21 scalony — zgłoszenie #45 oznaczone jako zrobione",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Commit d4e5f6 odwołuje się do zgłoszenia #45",
                'time' => "5 min temu",
            ],
        ],
        'options' => [
            'link-commits' => [
                'title' => "Powiązanie commitów",
                'description' => "Wykrywaj odwołania do zgłoszeń w komunikatach commitów.",
            ],
            'auto-close' => [
                'title' => "Automatyczne zamykanie zgłoszeń",
                'description' => "Oznacz zgłoszenia jako zrobione po scaleniu powiązanego PR.",
            ],
        ],
    ],
    'jira' => [
        'vendor' => "Od Atlassian",
        'description' => "Importuj epiki, zadania i podzadania z projektu Jira do Orbit.",
        'overview' => "Połącz Jirę, aby pobrać epiki, zadania i podzadania projektu do Orbit jako zgłoszenia, przekształcając statusy, priorytety i hierarchię z Jiry na własne w Orbit za pomocą mapowania, które kontrolujesz.\n\n**Co zyskujesz:**\n- Import epików, zadań i podzadań jednym kliknięciem z zachowaniem hierarchii\n- Konfigurowalne mapowanie statusów, priorytetów i etykiet na stały zestaw Orbit\n- Ponowne uruchomienie importu pomija zgłoszenia, które już zaimportowano",
        'preview' => [
            'p1' => [
                'title' => "Zaimportowano 496 zgłoszeń z projektu Jira „Orbit”",
                'time' => "Przed chwilą",
            ],
        ],
    ],
    'sentry' => [
        'vendor' => "Od Functional Software, Inc.",
        'description' => "Automatycznie zamieniaj alerty o błędach w zgłoszenia.",
        'overview' => "Połącz Sentry, aby automatycznie tworzyć zgłoszenie Orbit po wykryciu nowego błędu, z bezpośrednim linkiem do pełnego stack trace i historii zdarzeń.\n\n**Co zyskujesz:**\n- Automatyczne tworzenie zgłoszeń po nowych błędach Sentry\n- Link do pełnego stack trace w każdym powiązanym zgłoszeniu\n- Synchronizacja rozwiązania z powrotem do Sentry po zamknięciu zgłoszenia",
        'preview' => [
            'p1' => [
                'title' => "Nowe zgłoszenie utworzone z Sentry: „TypeError in checkout”",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Zaktualizowano liczbę zdarzeń Sentry w zgłoszeniu #103",
                'time' => "8 min temu",
            ],
        ],
        'options' => [
            'auto-create' => [
                'title' => "Automatyczne tworzenie zgłoszeń",
                'description' => "Automatycznie twórz zgłoszenie dla nowych błędów Sentry.",
            ],
            'resolution-sync' => [
                'title' => "Synchronizacja rozwiązania",
                'description' => "Oznacz zgłoszenie w Sentry jako rozwiązane, gdy powiązane zgłoszenie zostanie zamknięte.",
            ],
        ],
    ],
    'circleci' => [
        'vendor' => "Od Circle Internet Services",
        'description' => "Pokazuj status buildów i pipeline na powiązanych zgłoszeniach.",
        'overview' => "Połącz CircleCI, aby wyświetlać status buildów i pipeline bezpośrednio na zgłoszeniach, których dotyczą, dzięki czemu ryzyko dostarczania jest widoczne bez opuszczania Orbit.\n\n**Co zyskujesz:**\n- Status pipeline na żywo przy powiązanych zgłoszeniach\n- Powiadomienia o nieudanych buildach dla zgłoszeń w toku\n- Link do pełnego logu builda",
        'preview' => [
            'p1' => [
                'title' => "Build zakończony powodzeniem dla zgłoszenia #58",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Build nie powiódł się na gałęzi „fix/checkout-bug”",
                'time' => "20 min temu",
            ],
        ],
        'options' => [
            'pipeline-status' => [
                'title' => "Status pipeline",
                'description' => "Pokaż najnowszy wynik pipeline na powiązanych zgłoszeniach.",
            ],
            'failure-alerts' => [
                'title' => "Alerty o błędach",
                'description' => "Powiadom osobę przypisaną, gdy powiązany build się nie powiedzie.",
            ],
        ],
    ],
    'google-drive' => [
        'vendor' => "Od Google LLC",
        'description' => "Załączaj i podglądaj pliki z Dysku bezpośrednio w zgłoszeniach.",
        'overview' => "Połącz Dysk Google, aby załączać dokumenty, arkusze i prezentacje do zgłoszeń i projektów, z podglądem na żywo i dostępem uwzględniającym uprawnienia dla Twojego zespołu.\n\n**Co zyskujesz:**\n- Podglądy w treści dla załączonych plików z Dysku\n- Automatyczny dostęp do podglądu dla członków projektu\n- Pliki pozostają zsynchronizowane ze źródłem na Dysku",
        'preview' => [
            'p1' => [
                'title' => "Załączono „Q3-Roadmap.docx” do zgłoszenia #56",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Nadano dostęp do podglądu 3 członkom projektu",
                'time' => "1 godz. temu",
            ],
        ],
        'options' => [
            'file-previews' => [
                'title' => "Podglądy plików",
                'description' => "Pokaż podglądy w treści dla załączonych plików z Dysku.",
            ],
            'auto-permissions' => [
                'title' => "Automatyczne udostępnianie po dodaniu",
                'description' => "Automatycznie nadaj członkom projektu dostęp do podglądu.",
            ],
        ],
    ],
    'dropbox' => [
        'vendor' => "Od Dropbox, Inc.",
        'description' => "Załączaj i podglądaj pliki z Dropboxa bezpośrednio w zgłoszeniach.",
        'overview' => "Połącz Dropbox, aby załączać pliki do zgłoszeń i projektów, z podglądami w treści, dzięki czemu recenzenci nie muszą opuszczać Orbit, by sprawdzić najnowszą wersję.\n\n**Co zyskujesz:**\n- Podglądy w treści dla załączonych plików z Dropboxa\n- Automatyczne odświeżanie linku po aktualizacji pliku\n- Obsługa współdzielonych folderów dla całych projektów",
        'preview' => [
            'p1' => [
                'title' => "Załączono „Brand-Guidelines.pdf” do zgłoszenia #22",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Odświeżono link do „Q3-Budget.xlsx”",
                'time' => "30 min temu",
            ],
        ],
        'options' => [
            'file-previews' => [
                'title' => "Podglądy plików",
                'description' => "Pokaż podglądy w treści dla załączonych plików z Dropboxa.",
            ],
            'auto-refresh' => [
                'title' => "Automatyczne odświeżanie linków",
                'description' => "Utrzymuj linki do załączonych plików wskazujące na najnowszą wersję.",
            ],
        ],
    ],
    'microsoft-onedrive' => [
        'vendor' => "Od Microsoft Corporation",
        'description' => "Załączaj i podglądaj pliki z OneDrive bezpośrednio w zgłoszeniach.",
        'overview' => "Połącz OneDrive, aby załączać dokumenty z przestrzeni roboczej Microsoft 365 do zgłoszeń i projektów, z podglądami w treści plików Word, Excel i PowerPoint.\n\n**Co zyskujesz:**\n- Podglądy w treści dla załączonych plików z OneDrive\n- Automatyczny dostęp do podglądu dla członków projektu\n- Współpraca z bibliotekami dokumentów SharePoint",
        'preview' => [
            'p1' => [
                'title' => "Załączono „Spec-v2.docx” do zgłoszenia #71",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Nadano dostęp do podglądu 4 członkom projektu",
                'time' => "45 min temu",
            ],
        ],
        'options' => [
            'file-previews' => [
                'title' => "Podglądy plików",
                'description' => "Pokaż podglądy w treści dla załączonych plików z OneDrive.",
            ],
            'auto-permissions' => [
                'title' => "Automatyczne udostępnianie po dodaniu",
                'description' => "Automatycznie nadaj członkom projektu dostęp do podglądu.",
            ],
        ],
    ],
    'box' => [
        'vendor' => "Od Box, Inc.",
        'description' => "Załączaj i podglądaj pliki z Box bezpośrednio w zgłoszeniach.",
        'overview' => "Połącz Box, aby załączać pliki zarządzane przez przedsiębiorstwo do zgłoszeń i projektów, zachowując zgodność i kontrolę dostępu, a jednocześnie wiążąc pracę z Orbit.\n\n**Co zyskujesz:**\n- Podglądy w treści dla załączonych plików z Box\n- Dostęp respektujący istniejące uprawnienia w Box\n- Pełna historia wersji z Box dostępna w zgłoszeniu",
        'preview' => [
            'p1' => [
                'title' => "Załączono „Contract-Draft.pdf” do zgłoszenia #19",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Przesłano nową wersję „Onboarding-Guide.pdf”",
                'time' => "1 godz. temu",
            ],
        ],
        'options' => [
            'file-previews' => [
                'title' => "Podglądy plików",
                'description' => "Pokaż podglądy w treści dla załączonych plików z Box.",
            ],
            'version-history' => [
                'title' => "Historia wersji",
                'description' => "Pokaż historię wersji z Box przy załączonym pliku.",
            ],
        ],
    ],
    'google-calendar' => [
        'vendor' => "Od Google LLC",
        'description' => "Synchronizuj terminy zgłoszeń i kamienie milowe z kalendarzem.",
        'overview' => "Połącz Kalendarz Google, aby automatycznie tworzyć wydarzenia dla terminów zgłoszeń i kamieni milowych projektu, dzięki czemu terminy są widoczne także poza Orbit.\n\n**Co zyskujesz:**\n- Wydarzenie w kalendarzu dla każdego terminu zgłoszenia\n- Automatycznie synchronizowane wydarzenia kamieni milowych\n- Synchronizacja dwukierunkowa po zmianie terminu",
        'preview' => [
            'p1' => [
                'title' => "Utworzono wydarzenie: „Sprint review” — pt 14:00",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Zsynchronizowano termin zgłoszenia #91",
                'time' => "3 godz. temu",
            ],
        ],
        'options' => [
            'due-dates' => [
                'title' => "Synchronizuj terminy",
                'description' => "Utwórz wydarzenie w kalendarzu dla każdego terminu zgłoszenia.",
            ],
            'milestones' => [
                'title' => "Synchronizuj kamienie milowe",
                'description' => "Utwórz wydarzenia w kalendarzu dla kamieni milowych projektu.",
            ],
        ],
    ],
    'notion' => [
        'vendor' => "Od Notion Labs, Inc.",
        'description' => "Powiąż strony i bazy danych Notion ze zgłoszeniami i projektami.",
        'overview' => "Połącz Notion, aby powiązać strony i bazy danych ze zgłoszeniami i projektami, dzięki czemu specyfikacje i dokumenty planistyczne są o jedno kliknięcie od pracy, którą opisują.\n\n**Co zyskujesz:**\n- Podgląd w treści powiązanych stron Notion\n- Dwukierunkowe powiązanie zgłoszenia z jego specyfikacją\n- Wiersze bazy danych można tworzyć bezpośrednio ze zgłoszenia",
        'preview' => [
            'p1' => [
                'title' => "Powiązano stronę „Q3 Roadmap” ze zgłoszeniem #14",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Utworzono wiersz bazy danych dla zgłoszenia #14",
                'time' => "2 min temu",
            ],
        ],
        'options' => [
            'page-linking' => [
                'title' => "Powiązanie stron",
                'description' => "Powiąż stronę Notion ze zgłoszeniem z podglądem w treści.",
            ],
            'database-sync' => [
                'title' => "Synchronizacja bazy danych",
                'description' => "Automatycznie twórz wiersz bazy danych dla nowych zgłoszeń.",
            ],
        ],
    ],
    'trello' => [
        'vendor' => "Od Atlassian",
        'description' => "Synchronizuj zgłoszenia Orbit z kartami Trello na połączonej tablicy.",
        'overview' => "Połącz tablicę Trello, aby odzwierciedlać zgłoszenia Orbit jako karty — dla zespołów, które są dopiero w połowie migracji swojego przepływu pracy.\n\n**Co zyskujesz:**\n- Karta Trello tworzona dla każdego nowego zgłoszenia\n- Mapowanie list na statusy, które utrzymuje obie tablice w synchronizacji\n- Komentarze odzwierciedlane w obu kierunkach",
        'preview' => [
            'p1' => [
                'title' => "Utworzono kartę na tablicy „Sprint 12” dla zgłoszenia #133",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Karta przeniesiona do „Done” dla zgłoszenia #109",
                'time' => "12 min temu",
            ],
        ],
        'options' => [
            'card-sync' => [
                'title' => "Synchronizacja kart",
                'description' => "Utwórz kartę Trello dla każdego nowego zgłoszenia.",
            ],
            'status-mapping' => [
                'title' => "Mapowanie list",
                'description' => "Zmapuj listy Trello na statusy Orbit.",
            ],
        ],
    ],
    'asana' => [
        'vendor' => "Od Asana, Inc.",
        'description' => "Synchronizuj zadania i status między Orbit a projektami Asana.",
        'overview' => "Połącz projekt Asana, aby utrzymywać zadania i ich status w synchronizacji z powiązanymi zgłoszeniami Orbit — dla zespołów podzielonych między oba narzędzia w trakcie migracji.\n\n**Co zyskujesz:**\n- Dwukierunkowa synchronizacja statusu między Orbit a Asana\n- Mapowanie osoby przypisanej i terminu\n- Komentarze odzwierciedlane w obu kierunkach",
        'preview' => [
            'p1' => [
                'title' => "Zadanie zsynchronizowane z Asana: „Redesign onboarding flow”",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Zaktualizowano termin z Asana dla zgłoszenia #88",
                'time' => "25 min temu",
            ],
        ],
        'options' => [
            'status-sync' => [
                'title' => "Synchronizacja statusu",
                'description' => "Synchronizuj status zgłoszenia w obu kierunkach.",
            ],
            'due-date-sync' => [
                'title' => "Synchronizacja terminów",
                'description' => "Synchronizuj terminy w obu kierunkach.",
            ],
        ],
    ],
    'linear' => [
        'vendor' => "Od Linear Orbit, Inc.",
        'description' => "Importuj i synchronizuj zgłoszenia między Orbit a Linear.",
        'overview' => "Połącz Linear, aby zaimportować istniejące zgłoszenia lub utrzymywać w synchronizacji dwa zespoły pracujące w obu narzędziach, bez utraty historii po żadnej ze stron.\n\n**Co zyskujesz:**\n- Jednorazowy lub ciągły import zgłoszeń z Linear\n- Dwukierunkowa synchronizacja statusu powiązanych zgłoszeń\n- Mapowanie cykli i priorytetów",
        'preview' => [
            'p1' => [
                'title' => "Zaimportowano 12 zgłoszeń z zespołu Linear „Core”",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Zsynchronizowano status z Linear dla zgłoszenia #142",
                'time' => "18 min temu",
            ],
        ],
        'options' => [
            'issue-import' => [
                'title' => "Import zgłoszeń",
                'description' => "Zaimportuj istniejące zgłoszenia z Linear do projektu.",
            ],
            'status-sync' => [
                'title' => "Synchronizacja statusu",
                'description' => "Synchronizuj status zgłoszenia w obu kierunkach.",
            ],
        ],
    ],
    'figma' => [
        'vendor' => "Od Figma, Inc.",
        'description' => "Załączaj pliki Figma i zachowaj kontekst projektowy w zgłoszeniu.",
        'overview' => "Połącz Figmę, aby załączać pliki projektowe do zgłoszeń, z podglądem ramki w treści, dzięki czemu recenzenci zawsze widzą najnowszą wersję bez otwierania Figmy.\n\n**Co zyskujesz:**\n- Podgląd w treści powiązanej ramki Figma\n- Automatyczne odświeżanie podglądu po aktualizacji projektu\n- Wątki komentarzy, które odsyłają do pliku Figma",
        'preview' => [
            'p1' => [
                'title' => "Powiązano ramkę „Checkout redesign” ze zgłoszeniem #37",
                'time' => "Przed chwilą",
            ],
            'p2' => [
                'title' => "Odświeżono podgląd zgłoszenia #37",
                'time' => "40 min temu",
            ],
        ],
        'options' => [
            'frame-previews' => [
                'title' => "Podglądy ramek",
                'description' => "Pokaż podgląd w treści powiązanej ramki Figma.",
            ],
            'auto-refresh' => [
                'title' => "Automatyczne odświeżanie podglądów",
                'description' => "Odświeżaj podgląd automatycznie po aktualizacji projektu.",
            ],
        ],
    ],
];
