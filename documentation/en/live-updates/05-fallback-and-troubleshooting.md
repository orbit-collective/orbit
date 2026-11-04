# Fallback, security and troubleshooting

## Without Reverb: polling

If Reverb is not configured, or the socket is down, an open page re-reads the
props it shows on a timer, so the app behaves like it did before live updates
(and a little better).

File: `resources/js/live/useLiveFallback.ts`

- `useLiveFallback(reloads, scale = 1)` — `reloads()` names what to re-read.
  Every live hook registers one next to its channel subscription.
- The interval is the server's `LIVE_POLL_INTERVAL` (seconds; default 30, minimum
  10, `0` switches polling off), delivered in the `live.pollInterval` prop. Each
  tick waits up to 20% longer at random, so open tabs do not poll in lockstep.
  `scale` stretches it for data that changes less often (the notification bell
  uses `2`).
- It polls only while the status is `off` (no Reverb) or `offline` (socket down,
  being retried). While `connecting` and while `live` it does nothing.
- Only a **visible** tab reloads: the reload queue holds requests while the tab is
  hidden and runs one when it is shown again.
- When the socket comes back after an outage it re-reads once at once, because
  events sent meanwhile were missed.

File: `resources/js/live/useLiveStatus.ts`

`useLiveStatus()` returns `off | connecting | live | offline`, mapped from the
Pusher connection state by `onLiveStatus` in `echo.ts`.

Not polled: presence (nothing to read from the server) and the settings pages
(rarely edited together; they refresh when the page is visited).

## Security model

- Channels are **private**; `POST /broadcasting/auth` needs a signed-in user, is
  throttled (120 per minute) and answers JSON 401/403 instead of a login
  redirect. User channels: only the owner. Project channels: members with
  `projects.view`, through `Project::hasPermission`. Issue presence channels:
  members who can view the issue's project.
- Events carry ids and kinds; the data is re-fetched through authorised routes
  ([guide 02](./02-announce-a-change.md)). A removed member's open tab may still
  receive hints until it reconnects; it learns nothing from them, and
  `AccessChanged` makes it re-read the page anyway.
- The secret never reaches the browser (only the key). Sockets are accepted only
  from `REVERB_ALLOWED_ORIGINS`; Reverb rate-limits each connection and caps
  connections (`REVERB_APP_MAX_CONNECTIONS`) and message size.
- Nothing about live updates is configured at build time, so the same build runs
  with or without Reverb.

## Performance notes

- Changes are batched per request or job and sent after the response; the
  broadcast job has a 5-second timeout, one attempt, and a 2-second connect
  timeout to Reverb, so a dead socket server never stalls a worker for long.
- Page props are closures: a live refresh builds only the props it asks for.
- Reloads are debounced (250 ms, never more than 1.5 s late) and identical
  requests collapse into one.
- A dashboard listens on at most 25 project channels.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Nothing arrives, no errors | The shared `live` prop (network tab, an Inertia response's `props.live`): is `enabled` true? If not, `BROADCAST_CONNECTION` or a `REVERB_*` credential is missing in the environment of the **app** container |
| `enabled: true` but still nothing | Is the queue worker running with `--queue=live,default`? `make logs` for the `queue` container; with Redis queues, `docker compose exec redis redis-cli llen orbit-database-queues:live` is the number of waiting live jobs (the key is `<REDIS_PREFIX>queues:live`; list the real name with `redis-cli --scan --pattern '*queues:live'`). Run it a few times a few seconds apart: it should stay near 0, a number that keeps growing means no worker reads the `live` queue |
| Browser console: WebSocket connection failed | `REVERB_PUBLIC_*` must be what the **browser** can reach (`localhost:8080` in development, `wss` on 443 behind the proxy); `make logs-reverb` |
| Connection refused with code 4009 in the Reverb log | The page's origin is not in `REVERB_ALLOWED_ORIGINS` |
| `Class "Laravel\Reverb\ReverbServiceProvider" not found` in `queue`/`scheduler` | Run `make composer-install`: every PHP service keeps its own `vendor` volume |
| `Undefined constant SIGINT` in `reverb` | The image lacks `pcntl`: rebuild (`make composer-install`) |
| Own changes show twice | The `X-Socket-ID` header is not reaching Laravel (a proxy stripping it); `toOthers()` relies on it |
| Presence stays empty | Needs the socket; check the channel authorisation response for `presence-issue.{id}` in the network tab |

## Tests

- `resources/js/live/useLiveFallback.test.tsx`, `useLiveStatus.test.tsx` — the polling rules.
- `tests/Feature/Live/LiveConfigTest.php` — the poll interval bounds and the shared prop.
