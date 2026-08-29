# Docker, Doppler, and deployment

The root [`README.md`](../../../README.md#environment-configuration)
already walks through *using* the Docker/Doppler setup end to end
(commands, which mode you're in, troubleshooting `MissingAppKeyException`)
— this guide goes one level deeper on the *mechanics*: what each
Compose service actually is, the two-stage `Dockerfile`, and exactly
what the container entrypoint does on every start.

## The five Compose services

File: `docker-compose.yml`

| Service | Image/build target | What it does |
|---|---|---|
| `app` | `Dockerfile` target `php` | Runs `php artisan serve --host=0.0.0.0 --port=8000 --no-reload` — the actual Laravel app, port `8000` |
| `queue` | Same `php` target, same image | Runs `php artisan queue:work --tries=3` instead of `serve` — this is what actually sends queued mail (see [`../notifications/README.md`](../notifications/README.md)) and webhook jobs (see [`../integrations/README.md`](../integrations/README.md)); nothing gets delivered if this container isn't running |
| `vite` | `Dockerfile` target `node` | Runs `npm run dev -- --host` — the Vite dev server with HMR, port `5173` |
| `nsfwjs` | `andresribeiroo/nsfwjs` (pulled, not built) | The image-moderation service — see [`../content-moderation/README.md`](../content-moderation/README.md) |
| `uptime-kuma` | `louislam/uptime-kuma:2` | Optional monitoring dashboard, kept behind a Compose `profiles: [monitoring]` block so `make up`/`make setup` never starts it — only `make up-monitoring` does |

All five (when running) share one Docker network, `orbit-network` — a
plain bridge network that lets `app` reach `nsfwjs` by its service name
as a hostname (`http://nsfwjs:3333`, see the next section) rather than
by IP or `localhost`.

`app` declares `depends_on: [nsfwjs]` and `queue` declares
`depends_on: [app]` — Compose start-order hints, **not** health/readiness
gates (Compose's default `depends_on` only waits for the dependency's
container to start, not for the service inside it to actually be
ready to accept connections).

## Why `NSFW_SERVICE_URL` is hardcoded in `docker-compose.yml`, not templated

```yaml
NSFW_DETECTION_ENABLED: ${NSFW_DETECTION_ENABLED}
# Hardcoded (not ${NSFW_SERVICE_URL}): inside the app container, the nsfwjs
# service is only reachable via its Docker network hostname, never localhost.
NSFW_SERVICE_URL: http://nsfwjs:3333
NSFW_THRESHOLD: ${NSFW_THRESHOLD}
```

Every other variable is `${KEY}` — plain interpolation from whatever
environment `docker compose` itself runs in (Doppler's injected env,
or the fallback `.env` — see the root README for which mode applies
when). `NSFW_SERVICE_URL` is the one exception: `.env`/Doppler's copy
of it (`http://localhost:3333`, for the **native** setup, where
nsfwjs runs as a plain local process reachable via `localhost`) would
be wrong from *inside* the `app` container, where `localhost` refers to
the container itself, not the `nsfwjs` container next to it. Docker's
own internal DNS resolves the service name `nsfwjs` to the right
container instead, so the Compose file overrides the value outright
rather than passing the `.env`/Doppler value through.

## The two-stage `Dockerfile`

File: `Dockerfile`

```dockerfile
# -----------------------------------------------------------------------------
# PHP / Laravel application
# -----------------------------------------------------------------------------
FROM php:8.5-cli AS php
```

and, further down:

```dockerfile
# -----------------------------------------------------------------------------
# Node / Vite dev server
# -----------------------------------------------------------------------------
FROM node:26-alpine AS node
```

One `Dockerfile`, two independent build targets (`--target php` /
`--target node`, selected via `docker-compose.yml`'s `build.target`
key) — `app`/`queue` both build the `php` target (the exact same
image, different `command:`), `vite` builds `node`. Neither target
depends on or copies from the other; they're built entirely
separately, just described in one file for convenience.

The `php` target installs `pcov` (not `xdebug`) for code coverage —
cheap enough to leave enabled in every environment, per the
Dockerfile's own comment, unlike Xdebug which meaningfully slows down
every request. `composer install` runs **before** `COPY . .` (copying
only `composer.json`/`composer.lock` first) purely for Docker layer
caching — changing application code doesn't invalidate the
already-cached `vendor/` install layer, only changing a dependency
does.

## What the entrypoint does on every container start

File: `docker/entrypoint.sh`

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

This runs for **both** `app` and `queue` (they share the same `php`
image and `ENTRYPOINT`) — every start (not just the first) touches the
SQLite file into existence if missing, clears the config cache (so a
changed Doppler secret or `.env` value is actually picked up — a
cached config from a previous run would otherwise silently keep the
old value), and migrates. `exec "$@"` then hands off to whatever
`CMD`/`command:` the service actually declared (`serve` for `app`,
`queue:work` for `queue`) — the entrypoint itself never runs the app.

## Deployment

See the root [`README.md`](../../../README.md#deploying-to-production)
for the full production checklist (real database, production env
vars, `composer install --no-dev`, `npm run build`, `migrate --force`,
config/route/view caching, serving `public/`). One thing worth adding
here: whatever process supervisor runs the production app also needs
to run a **separate** `php artisan queue:work` process (or the
`queue` container's production equivalent) — queued notifications and
webhook deliveries silently never go out without one, exactly as in
local Docker development.

## Tests

Infrastructure configuration isn't something Pest/Vitest exercises —
the closest thing to a test here is CI itself
(`.github/workflows/ci.yml`), which runs the same commands a developer
would (`composer test`, `npm test`) rather than testing the Docker
setup directly.
