# Redis

Redis to backend cache, sesji i kolejek w Orbit. Wszystko, co przechowuje, jest jednorazowe, poza zadaniami w kolejce i aktywnymi sesjami (działa z persystencją append-only, więc te przetrwają restart); baza SQLite pozostaje jedynym źródłem prawdy.

## Przewodniki, w kolejności, w jakiej faktycznie będą potrzebne

1. **[Uruchom i obsługuj Redisa](./01-run-and-operate-redis.md)** — usługa Dockera `redis`, zmienne środowiskowe (także w Doppler), przełączanie sterowników cache/sesji/kolejek po kolei oraz podgląd i czyszczenie.
2. **[Cache'uj wartość i unieważniaj ją](./02-cache-a-value-and-invalidate-it.md)** — `CacheVersion`, zakres członkostwa i to, co musi podnieść wersję, gdy dodajesz nową ścieżkę zapisu.
3. **[Sesje na Redisie](./03-sessions-on-redis.md)** — dlaczego strona Security potrzebuje `SessionRegistry` i jak działa.

## Co jest dziś cache'owane

| Dane | Gdzie | Unieważniane przez |
| --- | --- | --- |
| Powiadomienia użytkownika (najnowsze 100) | `NotificationService::getAllForUser` | store, update, delete, mark-all-read |
| Lista projektów użytkownika i "ma projekty" | `ProjectService` | wersję członkostwa |
| Rola i uprawnienia użytkownika w projekcie | `Project::membershipOf()` | wersję członkostwa |
| Sesje, rate limiter, kolejka, blokady | sterowniki Laravela | nie dotyczy |

Wszystkie trzy cache'owane odczyty to współdzielone propsy Inertia albo sprawdzenia uprawnień, które wykonują się przy (prawie) każdym żądaniu.
