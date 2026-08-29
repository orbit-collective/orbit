# Przegląd połączenia frontend ↔ backend

Mapa całej funkcji: jak powiadomienia docierają do przeglądarki, jak stan read/unread wraca w obie strony i jak zakładka ustawień zapisuje preferencje. Warto przeczytać przed przewodnikiem 1 lub 2, jeśli nie miałeś wcześniej do czynienia z tym systemem.

## 1. Odczyt: skąd popup z dzwonkiem bierze dane

Powiadomienia **nie** są pobierane na żądanie przez popup — przychodzą jako współdzielony prop Inertii przy każdym pojedynczym żądaniu/wizycie strony, tak samo jak `auth.user`:

```
Every Inertia request
        │
        ▼
HandleInertiaRequests::share()
  - 'notifications' => fn () => $request->user()
        ? $this->notificationService->getAllForUser($request->user()->id)
        : []
  - 'emailEnabled' => fn () => $this->mailConfigurationService->isEnabled()
        │
        ▼  every page component receives `notifications` as a prop automatically
        │
        ▼
PageHeader.tsx
  - owns `showNotificationsPopup` (local state, toggled by the Bell icon button)
        │
        ▼ (only rendered while open)
NotificationsPopup.tsx
  - reads `notifications` via usePage<PageProps>().props (not its own fetch)
  - owns `onlyUnread` (local filter state)
  - computes `unreadCount` = notifications.filter(n => !n.read).length
        │
        ├─▶ NotificationHeader.tsx   (unread badge, "Mark all as read" button, "Only show unread" toggle)
        └─▶ NotificationsList.tsx    (maps to NotificationItem, or NotificationEmptyState if empty)
                    │
                    └─▶ NotificationItem.tsx (title, message, "View details" link to action_url, unread dot)
```

Ponieważ prop jest odświeżany przy każdej wizycie Inertii, odznaka/lista aktualizują się po każdej akcji, która powoduje przekierowanie z powrotem (czyli po każdej mutującej akcji powiadomień poniżej) — nie ma pollingu, nie ma WebSocketa, nie ma osobnego endpointu "liczba nieprzeczytanych". Sama ikona dzwonka nie niesie żadnej własnej odznaki/kropki — jedyny wskaźnik nieprzeczytanych żyje wewnątrz popupu, dopiero gdy zostanie otwarty.

Istnieje trasa `GET /notifications` (`NotificationController::index()`, nazwa `notifications.index`, zwraca kolekcję jako JSON) — nic w obecnym froncie jej nie wywołuje. Jest nieużywana przez popup (który polega wyłącznie na współdzielonym propie powyżej); zostaw ją bez zmian, chyba że masz konkretny nowy powód, żeby pobierać powiadomienia poza normalnym wczytaniem strony.

## 2. Zapis: oznacz jako przeczytane, oznacz wszystkie jako przeczytane, usuń

Trzy mutujące akcje, wszystkie jako żądania Inertii przekierowujące z powrotem (wyzwalające odświeżenie współdzielonego propu z części 1) — żadna z nich nie dotyka lokalnego stanu komponentu bezpośrednio:

```
NotificationItem's unread dot clicked
        │
        ▼
NotificationsPopup::handleMarkAsRead(id)
  - POST /notifications/{id}  body: { ...notification, read: true }
        │
        ▼
NotificationController::update()
  - abort_if(notification.user_id !== auth()->id(), 403)
  - validates type/title/message/read/action_url
  - NotificationService::update()
        │
        ▼  redirect back → shared prop refetches → item re-renders as read
```

```
"Mark all as read" clicked
        │
        ▼
NotificationsPopup::handleMarkAllAsRead()
  - POST /notifications/mark-all-read
        │
        ▼
NotificationController::markAllAsRead()
  - NotificationService::markAllAsReadForUser(auth()->id())
  - bulk UPDATE, scoped to the authenticated user's own unread rows only
```

`NotificationController::destroy()` (`DELETE /notifications/{notification}`) stosuje to samo sprawdzenie własności (`abort_if($notification->user_id !== auth()->id(), 403)`), ale zwraca zwykły JSON zamiast przekierowania — nic w obecnym froncie też jej nie wywołuje; dodaj przycisk usuwania do `NotificationItem.tsx`, stosując ten sam wzorzec `router.delete(...)`, jakiego używa `WorkspaceSettingsDeleteRoleModal.tsx` (zobacz
[`../permissions/03-grant-a-custom-role-in-bulk.md`](../permissions/03-grant-a-custom-role-in-bulk.md)
krok 3), jeśli musisz to podłączyć.

## 3. Ustawienia: jak zapisuje się przełącznik kanału

**Zupełnie osobna** ścieżka odczytu/zapisu od części 1–2 — ta *jest* prawdziwym wczytaniem strony, nie współdzielonym propem:

```
GET /settings?tab=notifications
        │
        ▼
SettingsController::index()
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
- `app/Http/Requests/Notifications/UpdateNotificationSettingsRequest.php`
- `app/Http/Middleware/HandleInertiaRequests.php` (współdzielone
  propy `notifications`/`emailEnabled`)
- `app/Notifications/NotificationMail.php` +
  `resources/views/emails/notification.blade.php`
- `resources/js/types/Notification.ts`
- `resources/js/Components/Organisms/PageHeader/PageHeader.tsx`,
  `NotificationsPopup/NotificationsPopup.tsx`,
  `NotificationsList/NotificationsList.tsx`,
  `AccountSettingsContent/AccountSettingsNotificationsTab.tsx`,
  `AccountSettingsContent/AccountSettingsNotificationTypeRow.tsx`
- `resources/js/Components/Molecules/NotificationHeader/NotificationHeader.tsx`,
  `NotificationItem/NotificationItem.tsx`,
  `NotificationEmptyState/NotificationEmptyState.tsx`

## Lokalna checklista testowania

1. Zaloguj się jako dwóch różnych użytkowników w tym samym projekcie (albo dwa profile przeglądarki), żeby mieć kogoś, kto wywoła event jako aktor, i kogoś, kto odbierze powiadomienie.
2. Żeby zobaczyć, jak mail faktycznie gdzieś ląduje podczas lokalnego developmentu, ustaw `MAIL_MAILER=log` w `.env` i podglądaj log (`php artisan pail`, już część `composer dev`) — mailery `log`/`array` nigdy nie zwracają błędu, więc cicho brakujący mail to przyczyna numer jeden problemu "dlaczego to nie dotarło" (zobacz podział na kanały w przewodniku 2).
3. Wyłącz kanał w Ustawienia konta → Powiadomienia, potem wywołaj ten typ ponownie i potwierdź, że nic nie zostało zapisane (`Notification::where('user_id', $id)->latest()->first()` przez `php artisan tinker`), a nie tylko "niewidoczne" — błąd UI ukrywający wiersz i wiersz nigdy niezapisany wyglądają identycznie z poziomu samego popupu.
