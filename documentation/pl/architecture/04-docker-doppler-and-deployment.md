# Docker, Doppler i deployment

Główny [`README.md`](../../../README.md#environment-configuration) już przeprowadza przez *używanie* setupu Docker/Doppler od początku do końca (komendy, w jakim jesteś trybie, rozwiązywanie `MissingAppKeyException`) — ten przewodnik schodzi o poziom głębiej w *mechanikę*: czym faktycznie jest każdy serwis Compose, dwuetapowy `Dockerfile`, i dokładnie co robi entrypoint kontenera przy każdym starcie.

## Pięć serwisów Compose

Plik: `docker-compose.yml`

| Serwis | Obraz/build target | Co robi |
|---|---|---|
| `app` | target `php` w `Dockerfile` | Uruchamia `php artisan serve --host=0.0.0.0 --port=8000 --no-reload` — faktyczna aplikacja Laravel, port `8000` |
| `queue` | Ten sam target `php`, ten sam obraz | Uruchamia `php artisan queue:work --tries=3` zamiast `serve` — to właśnie ono faktycznie wysyła kolejkowaną pocztę (zobacz [`../notifications/README.md`](../notifications/README.md)) i zadania webhooków (zobacz [`../integrations/README.md`](../integrations/README.md)); nic się nie dostarcza, jeśli ten kontener nie działa |
| `vite` | target `node` w `Dockerfile` | Uruchamia `npm run dev -- --host` — dev server Vite z HMR, port `5173` |
| `nsfwjs` | `andresribeiroo/nsfwjs` (pobierany, nie budowany) | Serwis moderacji obrazów — zobacz [`../content-moderation/README.md`](../content-moderation/README.md) |
| `uptime-kuma` | `louislam/uptime-kuma:2` | Opcjonalny dashboard monitoringu, trzymany za blokiem Compose `profiles: [monitoring]`, więc `make up`/`make setup` nigdy go nie startuje — tylko `make up-monitoring` to robi |

Wszystkie pięć (gdy działają) dzieli jedną sieć Docker, `orbit-network` — zwykła sieć bridge, pozwalająca `app` dosięgnąć `nsfwjs` po nazwie serwisu jako hostname (`http://nsfwjs:3333`, zobacz następną sekcję), nie po IP czy `localhost`.

`app` deklaruje `depends_on: [nsfwjs]`, a `queue` deklaruje `depends_on: [app]` — to podpowiedzi kolejności startu Compose, **nie** bramki health/readiness (domyślny `depends_on` Compose czeka tylko, aż kontener zależności się uruchomi, nie aż serwis w środku faktycznie będzie gotowy przyjmować połączenia).

## Dlaczego `NSFW_SERVICE_URL` jest zakodowane na sztywno w `docker-compose.yml`, nie templatowane

```yaml
NSFW_DETECTION_ENABLED: ${NSFW_DETECTION_ENABLED}
# Hardcoded (not ${NSFW_SERVICE_URL}): inside the app container, the nsfwjs
# service is only reachable via its Docker network hostname, never localhost.
NSFW_SERVICE_URL: http://nsfwjs:3333
NSFW_THRESHOLD: ${NSFW_THRESHOLD}
```

Każda inna zmienna to `${KEY}` — zwykła interpolacja z tego, w jakim środowisku sam `docker compose` działa (wstrzyknięte środowisko Dopplera albo fallbackowy `.env` — zobacz główny README po to, który tryb kiedy się stosuje). `NSFW_SERVICE_URL` to jeden wyjątek: kopia `.env`/Dopplera (`http://localhost:3333`, dla setupu **natywnego**, gdzie nsfwjs działa jako zwykły lokalny proces osiągalny przez `localhost`) byłaby błędna z *wewnątrz* kontenera `app`, gdzie `localhost` odnosi się do samego kontenera, nie do kontenera `nsfwjs` obok. Wewnętrzny DNS Dockera rozstrzyga zamiast tego nazwę serwisu `nsfwjs` do właściwego kontenera, więc plik Compose całkowicie nadpisuje wartość zamiast przepuszczać wartość z `.env`/Dopplera.

## Dwuetapowy `Dockerfile`

Plik: `Dockerfile`

```dockerfile
# -----------------------------------------------------------------------------
# PHP / Laravel application
# -----------------------------------------------------------------------------
FROM php:8.5-cli AS php
```

i, dalej w pliku:

```dockerfile
# -----------------------------------------------------------------------------
# Node / Vite dev server
# -----------------------------------------------------------------------------
FROM node:26-alpine AS node
```

Jeden `Dockerfile`, dwa niezależne targety builda (`--target php` / `--target node`, wybierane przez klucz `build.target` w `docker-compose.yml`) — `app`/`queue` oba budują target `php` (dokładnie ten sam obraz, inny `command:`), `vite` buduje `node`. Żaden target nie zależy od drugiego ani nic z niego nie kopiuje; są budowane całkowicie osobno, po prostu opisane w jednym pliku dla wygody.

Target `php` instaluje `pcov` (nie `xdebug`) do pokrycia kodu — wystarczająco tanie, żeby zostawić włączone w każdym środowisku, wg własnego komentarza Dockerfile, w przeciwieństwie do Xdebug, który znacząco spowalnia każde żądanie. `composer install` uruchamia się **przed** `COPY . .` (kopiując najpierw tylko `composer.json`/`composer.lock`) czysto dla cachowania warstw Dockera — zmiana kodu aplikacji nie unieważnia już zcachowanej warstwy instalacji `vendor/`, tylko zmiana zależności to robi.

## Co robi entrypoint przy każdym starcie kontenera

Plik: `docker/entrypoint.sh`

```sh
#!/bin/sh

# Bootstraps the Laravel app on container start, then execs the given command.

set -e

cd /app

# Ensure the SQLite database file exists before migrating.

mkdir -p database

if [ ! -f database/database.sqlite ]; then
    touch database/database.sqlite
fi

# Clear cached Laravel configuration so the application reads
# the current environment variables provided by Doppler.

php artisan config:clear

# Apply database migrations.

php artisan migrate --force

exec "$@"
```

To uruchamia się dla **obu** `app` i `queue` (dzielą ten sam obraz `php` i `ENTRYPOINT`) — każdy start (nie tylko pierwszy) dotyka plik SQLite w istnienie, jeśli go brakuje, czyści cache configu (żeby zmieniony sekret Dopplera albo wartość `.env` faktycznie zostały podchwycone — zcachowany config z poprzedniego uruchomienia inaczej po cichu trzymałby starą wartość), i migruje. `exec "$@"` przekazuje wtedy dalej do tego, co faktycznie zadeklarował `CMD`/`command:` serwisu (`serve` dla `app`, `queue:work` dla `queue`) — sam entrypoint nigdy nie uruchamia aplikacji.

## Deployment

Zobacz główny [`README.md`](../../../README.md#deploying-to-production) po pełną checklistę produkcyjną (prawdziwa baza danych, produkcyjne zmienne środowiskowe, `composer install --no-dev`, `npm run build`, `migrate --force`, cachowanie configu/tras/widoków, serwowanie `public/`). Jedna rzecz warta dodania tutaj: jakikolwiek supervisor procesów uruchamia produkcyjną aplikację, musi też uruchomić **osobny** proces `php artisan queue:work` (albo produkcyjny odpowiednik kontenera `queue`) — kolejkowane powiadomienia i dostarczenia webhooków po cichu nigdy się nie wysyłają bez tego, dokładnie tak jak w lokalnym developmencie na Dockerze.

## Testy

Konfiguracja infrastruktury to nie coś, co ćwiczy Pest/Vitest — najbliższą rzeczą do testu jest tutaj samo CI (`.github/workflows/ci.yml`), które uruchamia te same komendy co deweloper (`composer test`, `npm test`), zamiast testować sam setup Dockera bezpośrednio.
