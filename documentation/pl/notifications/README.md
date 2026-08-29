# Powiadomienia (w aplikacji i mailowe)

Orbit informuje użytkowników o aktywności na dwa sposoby: powiadomieniem w aplikacji (dropdown z dzwonkiem) oraz mailem, w podziale na `App\Enums\Notifications\NotificationType` — per użytkownik, per kanał, niezależnie przełączalne w ustawieniach konta. Ta kategoria dokumentuje ten system: jak event domenowy staje się powiadomieniem, jak preferencje per-użytkownik bramkują dostarczanie, oraz jeden krok, o którym łatwo zapomnieć przy dodawaniu nowego rodzaju powiadomienia.

## Przewodniki, w kolejności, w jakiej faktycznie będą potrzebne

1. **[Dodaj nowy typ powiadomienia](./01-add-a-new-notification-type.md)**
   — przećwiczony przykład dodania `MemberRoleChanged` (powiadamianie członka, gdy zmieni się jego rola w projekcie) od początku do końca: przypadek enuma, wystrzelenie i obsłużenie eventu oraz — krok, o którym łatwo zapomnieć — wiersz w ustawieniach na froncie, który w ogóle sprawia, że nowy typ jest widoczny i przełączalny.

Podłączenie eventu domenowego do pipeline'u powiadomień jest samo w sobie udokumentowane w ramach
[`../integrations/03-add-a-new-event-type.md`](../integrations/03-add-a-new-event-type.md)
(na przykładzie `IssueCreated`) — przewodnik z tej kategorii nie powtarza tego mechanizmu, tylko pokrywa wszystko, co jest specyficzne dla *typów powiadomień* ponad nim: wiersz w ustawieniach, domyślne wartości kanałów oraz podział frontend/backend, którego tamten przewodnik nie dotyka.

## Architektura w jednym akapicie

Każdy fakt wart powiadomienia to jeden przypadek `NotificationType` (np. `IssueAssigned`, `ProjectInvited`). Każde powiadomienie może pójść jednym lub obydwoma z dwóch `NotificationChannel` — `InApp` (domyślnie włączony) i `Email` (domyślnie wyłączony, zobacz `NotificationChannel::enabledByDefault()`) — a użytkownik może nadpisać dowolny kanał dla dowolnego typu poprzez wiersz `NotificationSetting` (`user_id` + `type` + `channel` + `enabled`; brak wiersza oznacza "użyj domyślnej wartości kanału"). `NotificationService::notify()` to jedyny lejek, przez który wszystko przechodzi: zawsze prosi `NotificationMailService` o (ewentualne) wysłanie maila, a następnie sprawdza preferencję odbiorcy dla powiadomień w aplikacji, zanim w ogóle zapisze wiersz `Notification` — pominięcie tego sprawdzenia zapisywałoby wiersze dla kanałów, które użytkownik jawnie wyłączył. Eventy domenowe nie wywołują `notify()` bezpośrednio; `SendNotificationListener::handle()` to jedyne miejsce, które zamienia fakt "to się wydarzyło" (`IssueAssigned`, `CommentAdded`, `ProjectInvited`, …) w "powiadom tę konkretną osobę, z tym tytułem/wiadomością" — zobacz
[`../integrations/03-add-a-new-event-type.md`](../integrations/03-add-a-new-event-type.md)
po to, jak sam event jest tworzony i rejestrowany. Na froncie tablica `defaultNotificationTypes` w `AccountSettingsNotificationsTab.tsx` to **ręcznie utrzymywane lustro** przypadków `NotificationType` z backendu (ikona, tytuł, opis per typ) — nic nie generuje jej z enuma, więc nowy typ z backendu jest niewidoczny w Ustawieniach, dopóki nie dodasz tam też jego wiersza.
