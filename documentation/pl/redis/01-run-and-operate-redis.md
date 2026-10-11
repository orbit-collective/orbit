# Uruchom i obsługuj Redisa

## Usługa

`docker-compose.yml` definiuje usługę `redis` (`redis:7-alpine`). Nie publikuje żadnego portu: jest dostępna tylko wewnątrz sieci Dockera, jako host `redis`. Usługi `app`, `queue` i `scheduler` czekają, aż będzie zdrowa.

- Persystencja append-only (wolumen `redis-data`), więc zadania w kolejce i sesje przetrwają `docker compose down`.
- `maxmemory 256mb` z `volatile-lru`: usuwane są tylko klucze z TTL (wpisy cache, sesje), nigdy listy kolejki.
- `REDIS_PASSWORD` jest opcjonalne. Brak, pusta wartość lub `null` oznacza brak hasła.

## Zmienne środowiskowe

Ustaw je w Doppler (albo w `.env`, gdy nie używasz Dopplera):

```dotenv
REDIS_CLIENT=phpredis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=null
```

`REDIS_HOST=redis` to nazwa usługi w Dockerze; używaj `127.0.0.1`, gdy uruchamiasz `php artisan` poza Dockerem. Po zmianie zmiennych zrestartuj stack, żeby kontenery je pobrały:

```bash
make down
make up-d
```

## Włącz Redisa, jeden sterownik naraz

Nic nie używa Redisa, dopóki nie przełączysz sterowników. Rób to w tej kolejności i restartuj stack po każdej zmianie:

```dotenv
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
```

- `SESSION_DRIVER=redis` wylogowuje wszystkich (stare sesje zostają w SQLite).
- `QUEUE_CONNECTION=redis` przestaje czytać tabelę `jobs`: najpierw pozwól jej się opróżnić.
- Żeby wrócić, ustaw zmienną z powrotem na `database` i zrestartuj.

## Zajrzyj do środka

```bash
docker compose exec redis redis-cli info keyspace
docker compose exec redis redis-cli --scan | head
```

Sesje leżą w bazie 0, a cache w bazie 1 (`REDIS_CACHE_DB`). Żeby opróżnić tylko cache (zostawia sesje i kolejkę):

```bash
docker compose exec redis redis-cli -n 1 flushdb
```

Nigdy `flushall` na współdzielonej instancji: wylogowuje wszystkich i usuwa zadania z kolejki.

## Testy

`phpunit.xml` wymusza `CACHE_STORE=array`, `SESSION_DRIVER=array` i `QUEUE_CONNECTION=sync`, więc zestaw testów nigdy nie dotyka Redisa.
