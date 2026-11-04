# Aktualizacje na żywo

Zmiany innych osób i nowe powiadomienia pojawiają się na otwartych stronach bez przeładowania: statusy, przypisania i komentarze w zgłoszeniu, tablica, lista, kalendarz, liczniki na dashboardzie, dzwonek powiadomień oraz informacja, kto jeszcze ogląda dane zgłoszenie. Całość działa na **Laravel Reverb** (serwer WebSocket) i **Laravel Echo** w przeglądarce. Bez Reverb aplikacja nadal działa i odświeża się sama w interwałach.

## Architektura w jednym akapicie

Zapis wywołuje `LiveUpdates` (bezpośrednio albo przez trait modelu `BroadcastsLiveChanges`). `LiveUpdates` zbiera i deduplikuje zmiany z jednego żądania lub zadania, a po jego zakończeniu wysyła jedno zdarzenie `ProjectChanged` na projekt (oraz `AccessChanged` / `NotificationsChanged` na użytkownika) w kolejce `live`. Reverb dostarcza je na **prywatne** kanały `project.{id}` i `user.{id}`. Zdarzenie niesie **tylko identyfikatory i rodzaje zmian, a nie zawartość rekordów**. W przeglądarce `useLiveChannel` je odbiera, `changeProps.ts` zamienia je na propsy Inertia, które się zestarzały, a `requestLiveReload` pobiera ponownie tylko te propsy zwykłymi, autoryzowanymi trasami (łączone w jedno żądanie, wstrzymywane, gdy karta jest ukryta albo przeciągana jest karta). Gdy gniazdo jest wyłączone lub nie działa, `useLiveFallback` robi to samo w interwałach. Obecność („kto ogląda zgłoszenie”, „ktoś edytuje opis”) korzysta z kanału presence i szeptów między klientami; wymaga gniazda i nie ma zamiennika.

## Przewodniki, w kolejności, w jakiej faktycznie będą potrzebne

1. **[Skonfiguruj Reverb](./01-set-up-reverb.md)** — usługa Dockera `reverb`, wszystkie zmienne środowiskowe (Doppler i `.env`), generowanie kluczy, development a produkcja za proxy z TLS, skalowanie.
2. **[Ogłoś zmianę](./02-announce-a-change.md)** — jak sprawić, by nowy model lub ścieżka zapisu informowała klientów na żywo: `BroadcastsLiveChanges`, `LiveUpdates`, zdarzenia i zasada, że payload nie niesie danych.
3. **[Zareaguj na zmianę w UI](./03-react-to-a-change-in-the-ui.md)** — utrzymanie strony w zgodzie: `useLiveChannel`, `changeProps.ts`, closures dla leniwych propsów, wstrzymywanie przeładowań.
4. **[Obecność i podpowiedzi o edycji](./04-presence-and-edit-hints.md)** — pokazywanie, kto jest na stronie, i ostrzeżenia o równoczesnej edycji.
5. **[Fallback, bezpieczeństwo i diagnostyka](./05-fallback-and-troubleshooting.md)** — co się dzieje bez Reverb, model bezpieczeństwa i co sprawdzić, gdy nic nie dociera.

## Co jest dziś na żywo

| Gdzie | Zdarzenie | Strona pobiera ponownie |
| --- | --- | --- |
| Dzwonek i popup powiadomień, powiadomienia przeglądarki | `notifications.changed` na `user.{id}` | `notifications`, `notificationUnreadCount` |
| Uprawnienia użytkownika i lista projektów | `access.changed` na `user.{id}` | całą stronę |
| Lista projektu, tablica, kalendarz, aktywność | `project.changed` na `project.{id}` | propsy widocznego widoku |
| Strona zgłoszenia (pola, komentarze, aktywność) | `project.changed` | `issue`, `ancestors`, `linkedPullRequests`, aktywność, gdy otwarta |
| Liczniki, trend i feed na dashboardzie | `project.changed` na każdym projekcie użytkownika | `issueStats`, `productivity_trend`, `projects`, `activityLogs` |
| Ustawienia: członkowie, role, etykiety, priorytety, typy zgłoszeń | `project.changed` | całą stronę |
| Kto ogląda zgłoszenie, ostrzeżenie o edycji opisu | kanał presence `issue.{id}` | bez przeładowania (stan klienta) |

## Zmienne środowiskowe w skrócie

| Zmienna | Do czego |
| --- | --- |
| `BROADCAST_CONNECTION` | `reverb` włącza aktualizacje na żywo; cokolwiek innego (lub brak kluczy) zostawia aplikację na odpytywaniu |
| `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET` | dane uwierzytelniające; `make reverb-keys` wypisuje nowy zestaw |
| `REVERB_PUBLIC_HOST`, `REVERB_PUBLIC_PORT`, `REVERB_PUBLIC_SCHEME` | z czym łączy się **przeglądarka** |
| `REVERB_ALLOWED_ORIGINS` | hosty, które mogą otworzyć gniazdo (domyślnie host z `APP_URL`) |
| `REVERB_SCALING_ENABLED` | współdzielenie zdarzeń między kilkoma instancjami Reverb przez Redis |
| `LIVE_POLL_INTERVAL` | odświeżanie zapasowe w sekundach (domyślnie 30, minimum 10, `0` = wyłączone) |
