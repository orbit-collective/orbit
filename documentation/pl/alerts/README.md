# Alerty UI (toasty)

Mały, przejściowy toast w prawym górnym rogu ekranu — jednolinijkowe potwierdzenie lub błąd, znikający automatycznie po kilku sekundach — to zupełnie inny system niż [powiadomienia](../notifications/README.md): jest wyłącznie po stronie klienta, efemeryczny, nigdy nie zapisywany, i nie ma nic wspólnego z `NotificationType`/`NotificationSetting`. Ta kategoria dokumentuje, jak to działa, oraz dwa niezależne sposoby, żeby go wywołać.

## Przewodniki, w kolejności, w jakiej faktycznie będą potrzebne

1. **[Wywołaj alert z akcji backendu](./01-trigger-an-alert-from-the-backend.md)**
   — sposób bez żadnego kodu na froncie: przekaż odpowiednią wartość flash w odpowiedzi przekierowania, a pojawi się jako toast automatycznie. Pokrywa jeden łatwy błąd: słownictwo kluczy flash tutaj *nie* jest tym samym, co słownictwo ważności modelu `Notification`.
2. **[Wywołaj alert z frontendu](./02-trigger-an-alert-from-the-frontend.md)**
   — wywołanie `addAlert()` bezpośrednio dla akcji, które nigdy nie przechodzą przez przekierowanie (kopiowanie do schowka, optymistyczny przełącznik). Przećwiczony przykład: dodanie potwierdzającego toastu do przycisku "copy issue link" w `IssuePageHeader`, który dziś go nie ma.
3. **[Dodaj nowy typ alertu](./03-add-a-new-alert-type.md)** — przećwiczony przykład dodania piątego `AlertType`, `neutral`, dla stonowanego toastu, który nie powinien konkurować wizualnie z success/error/warning/info.
4. **[Dostosuj zachowanie alertów](./04-customize-alert-behavior.md)** — przećwiczony przykład ograniczenia widocznego stosu do 5 (i wariant deduplikacji po wiadomości), oraz gdzie powinna trafiać każda przyszła reguła stakowania/priorytetu.
5. **[Testowanie komponentów, które używają alertów](./05-testing-components-that-use-alerts.md)** — dwa różne kształty testów, jakich używa to repozytorium: `renderHook` na `useAlert()` bezpośrednio z zamockowanym Inertia/`AlertContainer` (dla samego zachowania `AlertContext`), kontra prawdziwy `AlertProvider` owinięty wokół testowanego komponentu (dla wszystkiego, co go jedynie konsumuje).

## Architektura w jednym akapicie

`AlertProvider` (montowany raz, blisko korzenia `app.tsx`) posiada cały system: listę `AlertItem` w pamięci, renderowaną przez `AlertContainer`/`Alert` jako stały stos w prawym górnym rogu z animacją wejścia/wyjścia `framer-motion`, każdy usuwany automatycznie po upływie czasu (domyślnie 4000ms; przekaż `0`, żeby zostawić do ręcznego zamknięcia przez użytkownika). Są dokładnie dwa sposoby, żeby alert trafił na tę listę. **Automatycznie**: `AlertProvider` obserwuje każde wczytanie strony Inertii (efekt dla samego pierwszego, wyrenderowanego przez serwer) oraz każdą kolejną wizytę (`router.on('success', ...)`, wybrane zamiast efektu opartego na `usePage()` konkretnie dlatego, że Inertia ponownie używa tej samej referencji obiektu `flash` przy wizytach o identycznej treści, co przy naiwnym efekcie cicho pominęłoby drugi identyczny flash) i zamienia cztery konkretne klucze flash — `success`, `error`, `warning`, `information` — plus opcjonalny sąsiedni klucz `action_url` w wywołanie `addAlert()`. **Ręcznie**: dowolny komponent może wywołać `useAlert().addAlert(message, type, duration, actionUrl)` bezpośrednio, bez żadnego przejścia przez backend — zobacz przewodnik 2 po to, kiedy to jest właściwy wybór.
