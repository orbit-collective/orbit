# Run and operate Redis

## The service

`docker-compose.yml` defines a `redis` service (`redis:7-alpine`). It publishes
no port: it is reachable only inside the Docker network, as the host `redis`.
The `app`, `queue` and `scheduler` services wait for it to be healthy.

- Append-only persistence (`redis-data` volume), so queued jobs and sessions
  survive `docker compose down`.
- `maxmemory 256mb` with `volatile-lru`: only keys with a TTL (cache entries,
  sessions) are ever evicted, never the queue lists.
- `REDIS_PASSWORD` is optional. Unset, empty or `null` means no password.

## Environment variables

Set these in Doppler (or `.env` when you do not use Doppler):

```dotenv
REDIS_CLIENT=phpredis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=null
```

`REDIS_HOST=redis` is the Docker service name; use `127.0.0.1` when you run
`php artisan` outside Docker. After changing variables, restart the stack so the
containers pick them up:

```bash
make down
make up-d
```

## Turn Redis on, one driver at a time

Nothing uses Redis until you switch the drivers. Do it in this order and restart
the stack after each change:

```dotenv
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
```

- `SESSION_DRIVER=redis` signs everybody out (old sessions stay in SQLite).
- `QUEUE_CONNECTION=redis` stops reading the `jobs` table: let it drain first.
- To go back, set the variable back to `database` and restart.

## Look inside

```bash
docker compose exec redis redis-cli info keyspace
docker compose exec redis redis-cli --scan | head
```

Sessions live in database 0 and the cache in database 1 (`REDIS_CACHE_DB`).
To empty the cache only (leaves sessions and the queue):

```bash
docker compose exec redis redis-cli -n 1 flushdb
```

Never `flushall` on a shared instance: it signs everyone out and drops queued jobs.

## Tests

`phpunit.xml` forces `CACHE_STORE=array`, `SESSION_DRIVER=array` and
`QUEUE_CONNECTION=sync`, so the test suite never touches Redis.
