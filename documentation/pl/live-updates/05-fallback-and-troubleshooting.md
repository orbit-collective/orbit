# Fallback, bezpieczeństwo i diagnostyka

## Bez Reverb: odpytywanie

Jeśli Reverb nie jest skonfigurowany albo gniazdo nie działa, otwarta strona pobiera ponownie propsy, które pokazuje, w interwałach, więc aplikacja zachowuje się jak przed aktualizacjami na żywo (a trochę lepiej).

Plik: `resources/js/live/useLiveFallback.ts`

- `useLiveFallback(reloads, scale = 1)` — `reloads()` wskazuje, co pobrać ponownie. Każdy hook live rejestruje jedno obok subskrypcji kanału.
- Interwał to `LIVE_POLL_INTERVAL` z serwera (sekundy; domyślnie 30, minimum 10, `0` wyłącza odpytywanie), dostarczany w propie `live.pollInterval`. Każde odpytanie czeka losowo do 20% dłużej, żeby otwarte karty nie odpytywały równo w tym samym momencie. `scale` wydłuża interwał dla danych zmieniających się rzadziej (dzwonek powiadomień używa `2`).
- Odpytuje tylko, gdy status to `off` (brak Reverb) albo `offline` (gniazdo nie działa i jest ponawiane). W stanie `connecting` i `live` nie robi nic.
- Przeładowuje tylko **widoczna** karta: kolejka przeładowań wstrzymuje żądania, gdy karta jest ukryta, i wykonuje jedno po jej ponownym pokazaniu.
- Gdy gniazdo wraca po awarii, od razu pobiera dane jeszcze raz, bo zdarzenia wysłane w międzyczasie przepadły.

Plik: `resources/js/live/useLiveStatus.ts`

`useLiveStatus()` zwraca `off | connecting | live | offline`, mapowane ze stanu połączenia Pusher przez `onLiveStatus` w `echo.ts`.

Bez odpytywania: obecność (nie ma czego pobrać z serwera) i strony ustawień (rzadko edytowane wspólnie; odświeżają się przy odwiedzinach).

## Model bezpieczeństwa

- Kanały są **prywatne**; `POST /broadcasting/auth` wymaga zalogowanego użytkownika, ma throttle (120 na minutę) i odpowiada JSON 401/403 zamiast przekierowania do logowania. Kanały użytkownika: tylko właściciel. Kanały projektu: członkowie z `projects.view`, przez `Project::hasPermission`. Kanały presence zgłoszeń: członkowie, którzy mogą zobaczyć projekt zgłoszenia.
- Zdarzenia niosą identyfikatory i rodzaje; dane są pobierane ponownie autoryzowanymi trasami ([przewodnik 02](./02-announce-a-change.md)). Otwarta karta usuniętego członka może jeszcze dostawać podpowiedzi do czasu ponownego połączenia; niczego się z nich nie dowie, a `AccessChanged` i tak każe jej pobrać stronę od nowa.
- Sekret nigdy nie trafia do przeglądarki (tylko klucz). Gniazda są przyjmowane wyłącznie z `REVERB_ALLOWED_ORIGINS`; Reverb ogranicza tempo na połączenie oraz liczbę połączeń (`REVERB_APP_MAX_CONNECTIONS`) i rozmiar wiadomości.
- Nic z aktualizacji na żywo nie jest konfigurowane w czasie budowania, więc ten sam build działa z Reverb i bez niego.

## Uwagi o wydajności

- Zmiany są łączone per żądanie lub zadanie i wysyłane po odpowiedzi; zadanie nadawania ma timeout 5 sekund, jedną próbę i 2-sekundowy timeout połączenia z Reverb, więc martwy serwer gniazd nigdy nie blokuje workera na długo.
- Propsy stron są closures: odświeżenie na żywo buduje tylko te propsy, o które prosi.
- Przeładowania są debounce'owane (250 ms, nigdy bardziej niż 1,5 s spóźnione), a identyczne żądania zwijają się w jedno.
- Dashboard nasłuchuje na najwyżej 25 kanałach projektów.

## Diagnostyka

| Objaw | Sprawdź |
| --- | --- |
| Nic nie dociera, brak błędów | Współdzielony prop `live` (zakładka sieci, `props.live` w odpowiedzi Inertia): czy `enabled` jest prawdziwe? Jeśli nie, brakuje `BROADCAST_CONNECTION` albo któregoś z danych `REVERB_*` w środowisku kontenera **app** |
| `enabled: true`, a nadal nic | Czy worker kolejki działa z `--queue=live,default`? `make logs` dla kontenera `queue`; przy kolejkach Redis `docker compose exec redis redis-cli llen orbit-database-queues:live` pokazuje liczbę oczekujących zadań live (klucz to `<REDIS_PREFIX>queues:live`; prawdziwą nazwę wypiszesz przez `redis-cli --scan --pattern '*queues:live'`). Uruchom je kilka razy w odstępie paru sekund: powinno zostawać blisko 0, a liczba, która ciągle rośnie, oznacza, że żaden worker nie czyta kolejki `live` |
| W konsoli przeglądarki: WebSocket connection failed | `REVERB_PUBLIC_*` musi być tym, do czego **przeglądarka** ma dostęp (`localhost:8080` w developmencie, `wss` na 443 za proxy); `make logs-reverb` |
| Odrzucone połączenie z kodem 4009 w logu Reverb | Origin strony nie jest w `REVERB_ALLOWED_ORIGINS` |
| `Class "Laravel\Reverb\ReverbServiceProvider" not found` w `queue`/`scheduler` | Uruchom `make composer-install`: każda usługa PHP ma własny wolumen `vendor` |
| `Undefined constant SIGINT` w `reverb` | Obrazowi brakuje `pcntl`: przebuduj (`make composer-install`) |
| Własne zmiany pokazują się podwójnie | Nagłówek `X-Socket-ID` nie dociera do Laravela (proxy go usuwa); `toOthers()` na nim polega |
| Obecność zostaje pusta | Wymaga gniazda; sprawdź w zakładce sieci odpowiedź autoryzacji dla `presence-issue.{id}` |

## Testy

- `resources/js/live/useLiveFallback.test.tsx`, `useLiveStatus.test.tsx` — reguły odpytywania.
- `tests/Feature/Live/LiveConfigTest.php` — granice interwału odpytywania i współdzielony prop.
