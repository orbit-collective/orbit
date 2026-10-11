# Sesje na Redisie

Przy `SESSION_DRIVER=database` strona Security wypisuje tabelę `sessions`. Redis przechowuje jeden nieprzezroczysty payload na id sesji i nie da się go przeszukać po użytkowniku, więc `App\Support\Sessions\SessionRegistry` trzyma obok niego mapę per użytkownik.

## Jak to działa

- `EnforceSessionLifetime` rejestruje bieżącą sesję (`touch`) po zapisaniu `last_activity_at`, najwyżej raz na `SessionRegistry::TOUCH_INTERVAL` sekund, a dla nowego id sesji (po logowaniu) od razu.
- `UserRepository::getUserSessions`, `deleteSession` i `deleteOtherSessions` używają rejestru, gdy `SessionRegistry::enabled()` (sterowniki `redis`, `memcached` i `dynamodb`), a w pozostałych przypadkach tabeli.
- Sesja liczy się jako zalogowana tylko dopóki jej payload istnieje, więc wygasłe i odwołane sesje znikają przy odczycie listy. Odwołanie niszczy payload, więc to urządzenie zostaje wylogowane przy następnym żądaniu.
- `AuthenticatedSessionController::destroy` zapomina sesję przy wylogowaniu.

## Dodawanie kolejnego konsumenta sesji

Czytaj i odwołuj sesje przez `UserRepository`, nigdy bezpośrednio przez `DB::table('sessions')`: ta tabela jest pusta przy Redisie.

## Testy

`tests/Feature/Support/SessionRegistryTest.php` sprawdza rejestr na sesji w pamięci; podpięcie w middleware, wylogowaniu i repozytorium ma własne testy obok kodu, który pokrywa.
