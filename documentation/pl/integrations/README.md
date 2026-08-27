# Integracje

Orbit pozwala projektowi połączyć się z zewnętrznymi narzędziami (dziś: Discord; Slack, GitHub i 19 innych widnieje w katalogu jako "coming soon"). Ta kategoria dokumentuje cały system: katalog na froncie, ustawienia per-projekt zapisywane w bazie danych oraz opartą na eventach ścieżkę zmieniającą "coś się wydarzyło w Orbit" w "wiadomość dotarła na Discorda".

## Przewodniki, w kolejności, w jakiej faktycznie będą potrzebne

1. **[Dodaj nową integrację](./01-add-a-new-integration.md)** — zamień wpis w katalogu oznaczony jako "coming soon" (lub całkiem nowy) w realnie działającą integrację, od początku do końca.
2. **[Dodaj nowe uprawnienie](./02-add-a-new-permission.md)** — ogólny wzorzec dodawania uprawnienia `projects.*` i sprawienia, żeby poprawnie pojawiło się w Settings → Roles & management.
3. **[Dodaj ustawienia integracji](./03-add-integration-settings.md)** — nadaj integracji własny kształt konfiguracji wykraczający poza "enabled" i URL webhooka (np. nazwa kanału, klucz API, opcja liczbowa).
4. **[Dodaj nowy typ eventu](./04-add-a-new-event-type.md)** — podepnij zupełnie nowy rodzaj aktywności (na przykładzie `IssueCreated`), tak żeby zarówno powiadomienia użytkownika, jak i integracje mogły na niego reagować.
5. **[Przegląd połączenia frontend ↔ backend](./05-frontend-backend-wiring-overview.md)** — pełny kształt request/response dla całej funkcji, przydatny jako mapa przed zagłębieniem się w powyższe przewodniki.

## Architektura w jednym akapicie

Frontend ma **statyczny katalog** (`resources/js/types/Integrations.ts`) każdej integracji, jaką Orbit mógłby kiedykolwiek wspierać — nazwa, ikona, kategoria, opis, pod-opcje — niezależnie od tego, czy jest już faktycznie podłączona (`comingSoon: true/false`). Stan per-projekt (czy jest włączona, jej URL webhooka, które pod-opcje są aktywne) żyje w jednej tabeli w bazie danych, `project_integrations`. Eventy domenowe (`App\Events\*`), które już istnieją dla powiadomień w aplikacji/mailem — `IssueAssigned`, `IssueUnassigned`, `IssueUpdated`, `CommentAdded` — są *również* konsumowane przez drugi listener, `NotifyProjectIntegrationsListener`, który mapuje każdy event na kategorię pod-opcji (`issue-activity` / `comment-activity`) i przekazuje go do odpowiedniego `IntegrationNotifier`, jaki projekt danego eventu ma włączony dla tej kategorii. Dodanie integracji albo nowego rodzaju eventu nigdy nie wymaga dotykania tego listenera — zobacz przewodniki, żeby dokładnie zobaczyć, gdzie podłącza się każdy nowy element.
