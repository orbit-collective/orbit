# Sprzątanie starych powiadomień i historii aktywności

Powiadomienia i wpisy dziennika aktywności gromadzą się w nieskończoność, jeśli nic ich nie usuwa. Orbit daje każdemu użytkownikowi dwa sposoby, oba w **Ustawienia → Powiadomienia**:

- **automatyczny harmonogram** (codziennie / co tydzień / co miesiąc), który usuwa powiadomienia i *własne* wpisy aktywności użytkownika starsze niż N dni;
- przyciski **"Clean up now"**, które robią to samo jednorazowo, od razu.

Ten przewodnik opisuje, jak to się składa w całość i jak to rozszerzać (nowy rodzaj danych do sprzątania, nowa częstotliwość).

## Ruchome części

```
notification_retention_settings (jeden wiersz na użytkownika, opcjonalny)
  enabled, frequency, notifications_older_than_days,
  notifications_only_read, activity_older_than_days, last_run_at
        │
routes/console.php ── Schedule::command('notifications:prune')->hourly()
        │
PruneOldNotifications  →  NotificationRetentionService::runDue()
        │
        ├─ NotificationRetentionRepository::getDue($now)
        │     enabled AND (last_run_at IS NULL OR last_run_at <= now - frequency)
        ├─ apply(): purgeNotifications() / purgeActivity()
        └─ ustawia last_run_at (tylko jeśli apply() nie rzuciło wyjątku)
```

- **Model / tabela**: `App\Models\NotificationRetentionSetting`; jeden wiersz na użytkownika (`user_id` unikalne, kasowane kaskadowo razem z użytkownikiem). Brak wiersza oznacza "harmonogram wyłączony", `getSettings()` uzupełnia wartości domyślne.
- **Częstotliwość**: `App\Enums\Notifications\RetentionFrequency` (`daily`/`weekly`/`monthly`); `days()` to minimalny odstęp między dwoma uruchomieniami.
- **Dlaczego co godzinę?** Komenda działa co godzinę, ale każdy harmonogram sam decyduje, czy minął pełny okres, więc użytkownik nie potrzebuje pory dnia, a pominięty tick jest nieszkodliwy. Błąd u jednego użytkownika jest logowany i pomijany (jego harmonogram nadal czeka na uruchomienie), nigdy nie zatrzymuje pozostałych.
- **Co jest usuwane**: powiadomienia przez `NotificationRepository::deleteOlderThanForUser()` (opcjonalnie tylko przeczytane — `notifications_only_read`, domyślnie włączone) oraz **własne** wiersze `activity_logs` użytkownika (`user_id = ja`) przez `ActivityLogRepository::deleteOlderThanForUser()`. Wpisy napisane przez innych nigdy nie są ruszane, nawet w tym samym projekcie. Dziennik aktywności zasila też feed aktywności projektu, więc usunięcie własnych starych wpisów usuwa je także tam.
- **Cache**: czyszczenie powiadomień wywołuje `NotificationService::forget()`, żeby współdzielony prop i plakietka nieprzeczytanych nie pokazywały usuniętych wierszy.

## HTTP

| Trasa | Kontroler | Cel |
| --- | --- | --- |
| `GET /settings/notifications` | `SettingsController::notifications` | strona; przekazuje `notificationRetention` |
| `POST /account/notification-retention` | `NotificationRetentionController::update` | zapis harmonogramu |
| `POST /account/notification-retention/purge` | `NotificationRetentionController::purge` | jednorazowo: `target` (`notifications`\|`activity`), `days`, `only_read` |

Walidacja: wiek to liczba całkowita `1..NotificationRetentionService::MAX_DAYS` (3650); harmonogramu nie da się włączyć, gdy oba wieki są puste (`UpdateNotificationRetentionRequest`).

## Frontend

`AccountSettingsNotificationCleanup.tsx` (renderowany przez `AccountSettingsNotificationsTab.tsx`) trzyma lokalny *szkic* harmonogramu, włącza "Save schedule" tylko gdy różni się od zapisanego i pokazuje błędy serwera inline. "Clean up now" używa dwuetapowego potwierdzenia inline, bo usunięcia nie da się cofnąć. Predefiniowane wieki są w jednej tablicy `AGE_DAYS`.

## Rozszerzanie

### Dodaj kolejną wartość wieku

Dodaj liczbę do `AGE_DAYS` w `AccountSettingsNotificationCleanup.tsx`. Backend przyjmuje dowolną wartość do `MAX_DAYS`, więc nic więcej się nie zmienia.

### Dodaj nową częstotliwość

1. Dodaj przypadek i jego `days()` do `RetentionFrequency` (migracja przechowuje string, więc bez zmiany schematu).
2. Dodaj `{ value, label }` do `FREQUENCY_OPTIONS` oraz literał do typu `RetentionFrequency` w `resources/js/types/Notification.ts`.
3. `getDue()` iteruje po `RetentionFrequency::cases()`, więc nowy przypadek podchwyci sam.

### Sprzątaj kolejny rodzaj danych

1. Dodaj nullable kolumnę `<thing>_older_than_days` (nowa migracja — nigdy nie edytuj istniejącej) i wpisz ją do `$fillable`/`casts` modelu.
2. Dodaj metodę repozytorium w stylu `deleteOlderThanForUser()` oraz `purge<Thing>()` w `NotificationRetentionService`; wywołaj ją z `apply()`.
3. Rozszerz `UpdateNotificationRetentionRequest`, `getSettings()` i typ TS `NotificationRetention`; dodaj wiersz do komponentu sprzątania oraz opcję `target` w `PurgeNotificationDataRequest`.
4. Pamiętaj o skasowaniu każdego cache, który trzyma usuwane dane (`CacheVersion::bump(...)` dla współdzielonych list, zobacz [`../redis/`](../redis/README.md)).

## Testowanie

- PHP: `tests/Feature/NotificationRetentionTest.php` pokrywa logikę "należy do uruchomienia" (okres, wyłączone, izolacja błędów), komendę, rejestrację w harmonogramie i każdy endpoint. Stare wiersze buduj, przekazując `created_at` do factory.
- JS: `AccountSettingsNotificationCleanup.test.tsx`.
- Ręczne uruchomienie: `php artisan notifications:prune`.
