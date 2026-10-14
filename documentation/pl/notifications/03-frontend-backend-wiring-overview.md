# Przegląd połączenia frontend ↔ backend

Mapa całej funkcji: jak powiadomienia docierają do przeglądarki, jak stan read/unread wraca w obie strony i jak zakładka ustawień zapisuje preferencje. Warto przeczytać przed przewodnikiem 1 lub 2, jeśli nie miałeś wcześniej do czynienia z tym systemem.

## 1. Odczyt: skąd popup z dzwonkiem bierze dane

Najnowsza strona powiadomień dociera jako **współdzielony prop Inertii** przy każdej wizycie na stronie, tak samo jak `auth.user`; wszystko starsze (i każdy przefiltrowany widok) popup dociąga stronami.

```
Każde żądanie Inertii
        │
        ▼
HandleInertiaRequests::share()
  - 'notifications'          => najnowsze NotificationRepository::LIMIT (20)
                                wierszy, serwowane z cache per użytkownik
  - 'notificationUnreadCount' => nieprzeczytane w CAŁEJ skrzynce (osobny
                                cache, kasowany przy każdym zapisie)
        │
        ▼
PageHeader.tsx
  - czyta `notificationUnreadCount` do czerwonej plakietki na dzwonku
    (limit "9+") — nie może już liczyć samej listy, bo jest ucięta
  - zarządza `showNotificationsPopup`, zamyka go po kliknięciu poza/Escape
        │
        ▼ (renderowany tylko gdy otwarty)
NotificationsPopup.tsx
  - useNotificationsFeed(notifications, notificationUnreadCount)
        │
        ├─ pierwsza strona: współdzielony prop, bez żądania
        ├─ zmiana filtra (nieprzeczytane / ważność): GET /notifications
        │    ?unread=1&type=error  → zastępuje listę
        └─ koniec listy w widoku: GET /notifications?before=<ostatnie id>
             → dokleja kolejną stronę
```

`GET /notifications` (`NotificationController::index`) to JSON paginowany kursorem (keyset), od najnowszych:

```json
{ "data": [ ...powiadomienia ], "next_cursor": 81, "unread_count": 34 }
```

`before` to ostatnie id, które klient już ma (sortowanie wyłącznie po id, więc kursor i kolejność nie mogą się rozjechać, a powiadomienie, które przyjdzie w trakcie przewijania, nie przesuwa stron). `next_cursor` jest `null`, gdy skrzynka się skończyła. `per_page` jest przycinany do `NotificationRepository::MAX_PER_PAGE`. Błędy walidacji zwracają 422 JSON (`ListNotificationsRequest`), nie redirect, bo wywołującym jest axios.

Elementy popupu:

- `useNotificationsFeed.ts` — cały stan listy: elementy, kursor, licznik nieprzeczytanych, flagi ładowania/błędu, filtry oraz mutacje opisane niżej. Licznik żądań odrzuca spóźnioną odpowiedź dla filtra, który użytkownik już opuścił.
- `NotificationsList.tsx` — wartownik `IntersectionObserver` na końcu listy wywołuje `onLoadMore`; widoczny przycisk "Load more" to rozwiązanie awaryjne (i to, co klikają testy w jsdom).
- `NotificationHeader.tsx` (licznik nieprzeczytanych, oznacz wszystkie, filtr nieprzeczytanych, przełącznik zaznaczania), `NotificationFilterTabs.tsx` (ważność), `NotificationSelectionBar.tsx` (akcje masowe), `NotificationClearRead.tsx` ("Delete all read" z krokiem potwierdzenia), `NotificationItem.tsx` (checkbox w trybie zaznaczania).

## 2. Zapis: przeczytane, usuwanie, hurtowo

Każda mutacja **od razu** aktualizuje lokalny stan feedu i dopiero potem leci przez `router.post/delete` z `only: ['notifications', 'notificationUnreadCount']`, więc po redirectcie odświeżane są tylko współdzielone propy. Odrzucone żądanie wywołuje `refresh()`, które pobiera pierwszą stronę od nowa, żeby lista nigdy nie pokazywała czegoś, czego serwer odmówił.

| Akcja w UI | Żądanie | Kontroler |
| --- | --- | --- |
| oznacz jedno / kilka jako przeczytane | `POST /notifications/bulk-read` `{ids}` | `bulkMarkAsRead` |
| oznacz wszystkie | `POST /notifications/mark-all-read` | `markAllAsRead` |
| usuń jedno | `DELETE /notifications/{id}` | `destroy` (sprawdza właściciela, loguje) |
| usuń kilka | `POST /notifications/bulk-delete` `{ids}` | `bulkDestroy` |
| usuń wszystkie przeczytane | `DELETE /notifications/read` | `destroyRead` |

Trasy hurtowe przyjmują maksymalnie `NotificationRepository::MAX_BULK_IDS` (200) id (`BulkNotificationsRequest`), a repozytorium zawęża każde zapytanie przez `forUser($userId)`, więc id należące do kogoś innego jest po cichu ignorowane, nigdy ruszane. Każda metoda serwisu, która zapisuje, wywołuje `NotificationService::forget($userId)`, co kasuje zarówno cache listy, jak i cache licznika nieprzeczytanych.

`POST /notifications/{id}` (`update`) nadal istnieje, ale popup już go nie używa.

## 3. Ustawienia: jak zapisuje się przełącznik kanału

**Zupełnie osobna** ścieżka odczytu/zapisu od części 1–2 — ta *jest* prawdziwym wczytaniem strony, nie współdzielonym propem:

```
GET /settings/notifications
        │
        ▼
SettingsController::notifications()
  - 'notificationSettings' => $this->notificationSettingService->getAllSettings($user->id)
    (every NotificationType × NotificationChannel pair, defaulting via
    NotificationChannel::enabledByDefault() unless a NotificationSetting row overrides it)
        │
        ▼
AccountSettingsNotificationsTab.tsx
  - mergeNotificationSettings() folds the prop onto its own
    hand-maintained `defaultNotificationTypes` array (see guide 01's
    "one rule that matters most" — a type missing from that array
    never reaches this merge at all)
        │
        ▼ (toggle a switch)
AccountSettingsNotificationTypeRow.tsx → onInAppChange/onEmailChange
        │
        ▼
AccountSettingsNotificationsTab::updateNotificationType()
  - optimistically flips local state, then:
  - POST /account/notification-settings  body: { settings: { [type]: { in_app, email } } }
        │
        ▼
NotificationSettingController::update()
  - UpdateNotificationSettingsRequest (validates shape + that every
    key is a real NotificationType::cases() value)
  - NotificationSettingService::updateSettings()
    → updateOrCreate()s one NotificationSetting row per type/channel pair
    → logs one ActivityLog entry for the whole batch
        │
        ▼ onSuccess: success alert / onError: reverts the optimistic toggle + error alert
```

W przeciwieństwie do części 1–2, ta aktualizacja to **zwykły POST w stylu axios** (`router.post`, niezwiązany z odświeżaniem współdzielonego propu) — UI ufa własnemu optymistycznemu stanowi i reconciliuje tylko przy `onError`, nie czeka na świeży prop `notificationSettings`, żeby potwierdzić nową wartość.

## Pliki, których dotyka ta funkcja, od początku do końca

- `app/Models/Notification.php`, `app/Models/NotificationSetting.php`
- `app/Enums/Notifications/NotificationType.php`, `NotificationChannel.php`
- `app/Repositories/NotificationRepository.php`,
  `NotificationSettingRepository.php` (interfejs) +
  `EloquentNotificationSettingRepository.php` (implementacja)
- `app/Services/NotificationService.php`,
  `NotificationSettingService.php`, `NotificationMailService.php`
- `app/Listeners/SendNotificationListener.php`
- `app/Http/Controllers/NotificationController.php`,
  `NotificationSettingController.php`
- `app/Http/Requests/Notifications/UpdateNotificationSettingsRequest.php`,
  `ListNotificationsRequest.php`, `BulkNotificationsRequest.php`
- `app/Http/Middleware/HandleInertiaRequests.php` (współdzielone
  propy `notifications`/`notificationUnreadCount`/`emailEnabled`)
- `app/Notifications/NotificationMail.php` +
  `resources/views/emails/notification.blade.php`
- `resources/js/types/Notification.ts`
- `resources/js/Components/Organisms/PageHeader/PageHeader.tsx`,
  `NotificationsPopup/NotificationsPopup.tsx`,
  `NotificationsList/NotificationsList.tsx`,
  `AccountSettingsContent/AccountSettingsNotificationsTab.tsx`,
  `AccountSettingsContent/AccountSettingsNotificationTypeRow.tsx`
- `resources/js/Components/Molecules/NotificationHeader/NotificationHeader.tsx`,
  `NotificationFilterTabs/NotificationFilterTabs.tsx`,
  `NotificationItem/NotificationItem.tsx`,
  `NotificationEmptyState/NotificationEmptyState.tsx`,
  `NotificationSelectionBar/NotificationSelectionBar.tsx`,
  `NotificationClearRead/NotificationClearRead.tsx`
- `resources/js/hooks/useNotificationsFeed.ts`

Harmonogram sprzątania ma własne pliki, zobacz [przewodnik 06](./06-clean-up-old-notifications.md).

## Lokalna checklista testowania

1. Zaloguj się jako dwóch różnych użytkowników w tym samym projekcie (albo dwa profile przeglądarki), żeby mieć kogoś, kto wywoła event jako aktor, i kogoś, kto odbierze powiadomienie.
2. Żeby zobaczyć, jak mail faktycznie gdzieś ląduje podczas lokalnego developmentu, ustaw `MAIL_MAILER=log` w `.env` i podglądaj log (`php artisan pail`, już część `composer dev`) — mailery `log`/`array` nigdy nie zwracają błędu, więc cicho brakujący mail to przyczyna numer jeden problemu "dlaczego to nie dotarło" (zobacz podział na kanały w przewodniku 2).
3. Wyłącz kanał w Ustawienia konta → Powiadomienia, potem wywołaj ten typ ponownie i potwierdź, że nic nie zostało zapisane (`Notification::where('user_id', $id)->latest()->first()` przez `php artisan tinker`), a nie tylko "niewidoczne" — błąd UI ukrywający wiersz i wiersz nigdy niezapisany wyglądają identycznie z poziomu samego popupu.
