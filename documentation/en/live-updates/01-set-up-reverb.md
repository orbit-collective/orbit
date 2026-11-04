# Set up Reverb

## The service

File: `docker-compose.yml`

`reverb` is the same image as `app` with a different command:

```yaml
command: ["php", "artisan", "reverb:start", "--host=0.0.0.0", "--port=8080", "--no-interaction"]
```

- The app, queue and scheduler containers **publish** events to it over the
  Docker network as `reverb:8080` (`REVERB_HOST`, `REVERB_PORT` and
  `REVERB_SCHEME` are hard-coded in the compose file, like `NSFW_SERVICE_URL`).
- Browsers **connect** to the published port (`8080` by default,
  `REVERB_PUBLISHED_PORT` changes it) or, in production, to a TLS proxy.
- The image needs the `pcntl` PHP extension (the `Dockerfile` installs it).
- The queue worker must read the `live` queue first:
  `queue:work --queue=live,default --tries=3` (already set in the compose file and
  in `composer dev`). Without it live events are never delivered.

After pulling the live-updates code run `make composer-install` and
`make npm-install`: they rebuild the images and renew the `vendor` and
`node_modules` volumes of **every** PHP service (`app`, `queue`, `scheduler`,
`reverb`), each of which keeps its own copy.

## Generate the credentials

```bash
make reverb-keys
```

prints a fresh trio. Nothing is written anywhere; paste it into Doppler (or
`.env`):

```dotenv
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=268696
REVERB_APP_KEY=a78920cb20354742cb7dfe8bbda3c499
REVERB_APP_SECRET=a8f2d1da5822e2164e800f233ff56090
```

The key is public (the browser receives it); the secret never leaves the server.

## Development

```dotenv
REVERB_PUBLIC_HOST=localhost
REVERB_PUBLIC_PORT=8080
REVERB_PUBLIC_SCHEME=http
```

`make up`, then open two browsers (or a normal and a private window) signed in as
two members of the same project and change an issue in one. `make logs-reverb`
tails the server.

## Production

Put a reverse proxy with TLS in front of the `reverb` container so the browser
uses `wss://` on port 443. The public host can be a subdomain of the app:

```dotenv
BROADCAST_CONNECTION=reverb
REVERB_PUBLIC_HOST=ws.example.com
REVERB_PUBLIC_PORT=443
REVERB_PUBLIC_SCHEME=https
REVERB_ALLOWED_ORIGINS=example.com
```

Caddy (certificates are automatic):

```caddyfile
ws.example.com {
    reverse_proxy reverb:8080
}
```

nginx:

```nginx
server {
    listen 443 ssl;
    server_name ws.example.com;

    location / {
        proxy_pass http://reverb:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 120s;
    }
}
```

`REVERB_ALLOWED_ORIGINS` is the list of hosts (comma separated) whose pages may
open a socket; a connection from any other origin is refused. It defaults to the
host of `APP_URL`.

### Doppler checklist

Add to the config of every environment that should be live:

| Variable | Value |
| --- | --- |
| `BROADCAST_CONNECTION` | `reverb` |
| `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET` | from `make reverb-keys` |
| `REVERB_PUBLIC_HOST`, `REVERB_PUBLIC_PORT`, `REVERB_PUBLIC_SCHEME` | what the browser opens |
| `REVERB_ALLOWED_ORIGINS` | your app's host (production) |

Optional: `LIVE_POLL_INTERVAL`, `REVERB_PUBLISHED_PORT`,
`REVERB_APP_MAX_CONNECTIONS` (default 1000), `REVERB_APP_RATE_LIMITING_ENABLED`
(default on). Leave every `REVERB_*` credential empty and live updates are simply
off.

## How the app decides it is live

File: `config/live.php`

`live.enabled` is true only when `BROADCAST_CONNECTION=reverb` **and** the app
id, key, secret and host are all present. `config/broadcasting.php` downgrades
the default broadcaster to `null` in the same situation, so a half-configured
environment never throws on boot. The browser never reads `VITE_*` variables for
this: `HandleInertiaRequests` hands the connection (public key, host, port,
scheme, poll interval) to the page as the shared `live` prop at runtime, which
keeps Doppler the only place to configure it.

## Scaling

One Reverb instance is plenty for a small team. To run several behind a load
balancer set `REVERB_SCALING_ENABLED=true`: instances then exchange events over
Redis pub/sub (the same `redis` service), so a client on one instance receives
events published through another.

## Tests

- `tests/Feature/Live/LiveConfigTest.php` — the shared prop, the guard that
  degrades to `null`, the poll interval bounds.
- `tests/Feature/Live/LiveChannelsTest.php` — channel authorisation.
- `resources/js/live/echo.test.ts` — the Echo client.
