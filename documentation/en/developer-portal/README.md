# Developer Portal

Settings → Developer Portal is a local-development diagnostics page: the
uptime of this project's Docker containers, the newest errors from the
application log, every user and project on the instance, and instance-wide
totals (users, projects, issues by status category, comments). It is **not** a
production feature: it exists only when `APP_ENV` is exactly `local`.

## Architecture in one paragraph

`config/developer-portal.php` turns the portal on when `APP_ENV === 'local'`
(from `.env` or Doppler) and nowhere else — `production`, `prod`, `staging` and
`testing` all leave it off. The `developer-portal` route middleware
(`EnsureDeveloperPortalAccess`) answers 404 while it is off and 403 for a user
without the `developer.portal.view` permission. `HandleInertiaRequests` shares
`developerPortalEnabled` so the sidebar hides the Developer section for
everyone else. `SettingsController::developerPortal()` ships the totals and the
two paginated lists immediately and **defers** the slow reads (`containers`
from the Docker socket, `errorLog` from the log file). `DeveloperPortalChanged`
on the private `developer-portal` channel tells open tabs which props went
stale; `useDeveloperPortalLive` re-reads only those.

## Guides

1. **[Enable and protect the portal](./01-enable-and-protect-the-portal.md)** —
   the `APP_ENV=local` switch, the `developer.portal.view` permission, the
   middleware, the shared prop and the sidebar.
2. **[Add a section to the portal](./02-add-a-section-to-the-portal.md)** — a
   new data source end to end: service, deferred prop, section component,
   live kind, tests and story.
3. **[The chart components](./03-chart-components.md)** — `BarChartCard`,
   `DayBreakdownCard`, `PercentBarsCard` and `TrendBadge`, and how to feed them.

## Interactions

- **Container logs.** Click a container row to open its details and a live log
  viewer (filter, errors only, follow every 3 s while the tab is visible,
  refresh, copy). The viewer reads
  `GET /settings/dev-portal/containers/{id}/logs`, which sits behind the same
  `developer-portal` middleware, accepts only ids of this Compose project's
  containers and returns at most 500 lines (`DockerContainerService::logs()`
  demultiplexes Docker's stdout/stderr frames, handles TTY output and strips
  ANSI codes).
- **Folding.** Every card and panel folds from its header and keeps a one-line
  summary while folded; the choice is remembered per browser
  (`useCollapsedSections`, key `developer-portal-sections`) and a Collapse /
  Expand all button sits on top. The users and projects lists start folded.
  A new section joins by adding its id to `SECTION_DEFAULTS` in
  `DeveloperPortalTab.tsx` and spreading `collapse('<id>', summary)` onto its
  `SettingsPanel` or chart card.
- **Recent errors** are paginated (`errors_page` / `errors_perPage`) like the
  user and project lists.

## Docker access

Container uptime is read from the Docker Engine API through the Unix socket
(`developer-portal.docker.socket`, default `/var/run/docker.sock`), listing only
containers labelled `com.docker.compose.project=<developer-portal.docker.project>`
(default `orbit`). The `app` service therefore needs the socket mounted
read-only:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

Mounting the socket lets the container see (and, read-only or not, effectively
control) Docker on the host, which is why this is only meant for a local
machine. Without the mount the portal still works and shows a hint instead of
the container list.
