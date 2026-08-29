# Zakres i nie-cele

Rzeczy, które na pierwszy rzut oka wyglądają, jakby mogły brakować, były na wpół zbudowane albo warte "naprawienia", ale w rzeczywistości są celowe — przeczytaj to przed założeniem, że coś jest błędem albo przeoczeniem.

## Brak REST/JSON API

Orbit nie ma żadnego wersjonowanego, udokumentowanego API do konsumpcji przez strony trzecie i nie zmierza w tym kierunku — każda trasa albo renderuje stronę Inertii, albo obsługuje mutację i przekierowuje z powrotem. `NotificationController::index()` faktycznie zwraca surowy JSON (`GET /notifications`), ale z perspektywy frontendu to martwy kod — popup powiadomień odczytuje zamiast tego ze współdzielonego propa Inertii (zobacz [`../notifications/03-frontend-backend-wiring-overview.md`](../notifications/03-frontend-backend-wiring-overview.md)). Nie traktuj istniejącego endpointu zwracającego JSON jako precedensu dla nowej powierzchni API.

## `laravel/sanctum` to zależność, nie funkcja

Jest w `composer.json` i nigdzie więcej — żadnego configu `Sanctum::`, żadnego middleware `auth:sanctum`, żadnych personal access tokenów nigdzie w kodzie. Autoryzacja to zwykła sesyjna autoryzacja Laravela (`AuthenticatedSessionController`, `RegisteredUserController`, middleware `auth`) z konfigurowalną per-użytkownik kolumną `session_lifetime`. Jeśli prawdziwe API oparte o tokeny kiedykolwiek stanie się celem, Sanctum jest już wciągnięty pod to — ale do tego czasu traktuj go jako nieużywany, nie jako do połowy zaimplementowaną funkcję do dokończenia.

## Brak globalnej roli "admin"

Nie ma kolumny `role` na `users` ani żadnego pojęcia administratora całej witryny nigdzie w aplikacji. Każde uprawnienie jest scope'owane do projektu — zobacz [`../permissions/README.md`](../permissions/README.md). Ta sama osoba może być Ownerem jednego projektu i zwykłym Memberem (albo w ogóle nie być członkiem) innego; nie ma użytkownika, który mógłby działać na każdym projekcie w systemie.

## Większość zakładek ustawień Workspace to placeholdery

`SETTINGS_TABS` w `resources/js/types/Settings.ts` wylicza Labels, Statuses, Priorities, Templates i Documents (sekcja Workspace) oraz Export (sekcja Account) z `enabled: false` — renderują się w nawigacji bocznej dla odkrywalności, ale sama zakładka jest nieosiągalna (zobacz sekcję architektury w [`../settings-tabs/README.md`](../settings-tabs/README.md) po dokładnie to, jak `enabled: false` jest egzekwowane). `AccountSettingsExportTab.tsx` już istnieje jako komponent i nawet się renderuje, jeśli dotrzesz do niego programowo — po prostu nigdy nie jest osiągalny przez normalną nawigację, ponieważ bramka włączonej zakładki żyje w `Pages/Settings/Index.tsx`, jeden poziom nad tym, gdzie ten komponent jest renderowany.

## 20 z 21 integracji w katalogu to "coming soon"

Tylko Discord jest podłączony na backendzie (`ProjectIntegrationService::AVAILABLE_INTEGRATIONS`) — każdy inny wpis w katalogu `resources/js/types/Integrations.ts` istnieje czysto jako dane wyświetlane na froncie (nazwa, ikona, kategoria, opis) z `comingSoon: true`, a backend nie ma dla żadnego z nich pasującego `IntegrationNotifier`. Zobacz [`../integrations/01-add-a-new-integration.md`](../integrations/01-add-a-new-integration.md) po zamianę jednego z nich w prawdziwą integrację.

## Wzmianki (mentions) w issues są zdefiniowane, ale niezaimplementowane

`NotificationType::IssueMentioned` istnieje jako przypadek enuma, a Ustawienia konta → Powiadomienia już mają dla niego przełącznik — ale nic w kodzie nigdy go nie wystrzeliwuje. Nie ma żadnego parsowania `@wzmianek` nigdzie w ścieżce tworzenia komentarza. Nie zakładaj, że przypadek `NotificationType` mający wiersz w ustawieniach oznacza, że funkcja za nim stojąca jest żywa; sprawdź też, czy istnieje faktyczne miejsce wywołania `notify()` (zobacz [`../notifications/01-add-a-new-notification-type.md`](../notifications/01-add-a-new-notification-type.md)).

## Brak deduplikacji czy limitu na stosie toastów/alertów

Pokryte dogłębnie w [`../alerts/04-customize-alert-behavior.md`](../alerts/04-customize-alert-behavior.md) — wywołanie tego samego alertu wielokrotnie, albo wielu alertów w szybkiej kolejności, dziś stakuje je wszystkie bez żadnego limitu. To nie tyle błąd, co "nic tego jeszcze nie potrzebowało".

## Testy

Nie-cele to nie zachowanie do przetestowania — ten przewodnik istnieje, żebyś nie szukał testów pokrywających funkcję, która nigdy nie została zbudowana.
