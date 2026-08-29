# Log aktywności

Każda zmieniająca projekt akcja w całej aplikacji zapisuje zwykły tekstowy wiersz `ActivityLog` — "Changed Jane's role to admin", "Deleted the \"Owner\" role" — ale, zaskakująco, **nic w aplikacji dziś ich nie odczytuje z powrotem**. Ta kategoria dokumentuje stronę zapisu (już używaną wszędzie) oraz jedną rzecz wartą zrobienia dalej: faktyczne wyświetlenie tego gdzieś.

## Przewodniki, w kolejności, w jakiej faktycznie będziesz ich potrzebować

1. **[Zaloguj nowy rodzaj aktywności](./01-log-a-new-kind-of-activity.md)** — jednolinijkowy wzorzec, jakiego już trzyma się każdy Service; przeczytaj to najpierw, ponieważ to wzorzec, którego prawie na pewno już poprawnie używasz, nie zdając sobie sprawy, że to "system logu aktywności".
2. **[Wyświetl log aktywności w UI](./02-surface-the-activity-log-in-the-ui.md)** — przećwiczony przykład faktycznego wyrenderowania ostatniej aktywności projektu, ponieważ dziś strona odczytu istnieje w Repozytorium, ale nie jest wywoływana znikąd.

## Architektura w jednym akapicie

`ActivityLog` (`app/Models/ActivityLog.php`) jest celowo niestrukturalny: `project_id` (nullable — `null` dla aktywności na poziomie konta, jak zmiana hasła), `user_id` oraz pojedyncza kolumna wolnego tekstu `body` — nie ma żadnego enuma `type`/`action` do rozszerzenia, w przeciwieństwie do [powiadomień](../notifications/README.md) czy [alertów](../alerts/README.md). `ActivityLogService::log(?int $projectId, string $body, ?int $userId = null)` to jedyna metoda, jaką wywołuje każdy inny Service jako efekt uboczny tego, co faktycznie robi — `$userId` domyślnie to `auth()->id()`, gdy pominięty, co jest powodem, dla którego większość miejsc wywołania (zobacz np. `RoleService`/`ProjectMemberService`) nigdy nie przekazuje go jawnie. `ActivityLogRepository` już ma metody odczytu, `getRecentForProject()`/`getRecentForUser()` (obie `latest()->limit(15)`), ale żadna z nich nie jest dziś wywoływana z żadnego Service ani Controllera — log aktywności jest w praktyce tylko-do-zapisu, dopóki coś ich nie wywoła (zobacz przewodnik 2).
