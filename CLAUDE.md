# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Orbit is an issue/project tracker built as a Laravel + Inertia.js + React (TypeScript) monolith. There is no separate API — the server renders Inertia pages and the React frontend consumes props directly. SQLite is the default database (`database/database.sqlite`).

## Commands

### Frontend (npm)
- `npm run dev` — Vite dev server (HMR). For the full stack use the composer `dev` script below.
- `npm run build` — type-check (`tsc`) then production build.
- `npm run lint` — oxlint over `resources/js` with `--fix`. `npm run format` / `npm run format:check` — oxfmt.
- Unused code (config in `knip.json`):
  - `npm run knip` — reports unused files, exports, types and dependencies (knip). Exits non-zero while there are findings.
  - `npm run knip:fix` — removes the `export` from unused exports and types, and drops unused barrel re-exports, then formats the touched files. It only strips the keyword, so the now-local declaration may be dead; it never touches `package.json` or deletes files (do that by hand: `npx knip --fix --fix-type dependencies` needs an `npm install` after, `--allow-remove-files` deletes files).
  - `npm run unused` — reports unused imports and variables (oxlint `no-unused-vars`, which is off in `.oxlintrc.json`, so plain `npm run lint` does not catch them). `npm run unused:fix` removes the unused imports; `npm run unused:fix:dangerous` also removes unused local variables with their initializers, so review the diff.
  - `npm run cleanup` — `unused:fix` followed by `knip:fix`. Always run the tests afterwards.
- `npm test` — Vitest (watch mode by default). `npm run test:watch`, `npm run test:coverage`.
- `npm run storybook` — Storybook dev server (:6006); `npm run build-storybook` — static build; `npm run test:stories` — every story rendered + its `play` function run as a Vitest test.
- Run a single frontend test: `npx vitest run resources/js/Components/Atoms/Button/Button.test.tsx` (add `-t "test name"` to filter).

### Backend (php / composer)
- `composer dev` — runs `php artisan serve`, the queue listener, log tail (`pail`), and `npm run dev` concurrently. Preferred way to run the app locally.
- `composer setup` — one-time bootstrap: install deps, copy `.env`, generate key, migrate, build.
- `composer test` — clears config then runs the PHP test suite.
- `composer test-coverage` — runs the PHP test suite in parallel (`vendor/bin/pest --parallel`, one process per core) with code coverage (requires Xdebug or PCOV) and fails if `app/` line coverage drops below the threshold set in that script; this is what CI runs as the coverage gate. Use `vendor/bin/pest`, not `php artisan test`, for parallel coverage: `artisan test --parallel` silently skips coverage and `--min`.
- Run a single PHP test: `php artisan test --filter=IssueServiceTest` (tests use Pest).
- `php artisan migrate` / `php artisan migrate:fresh --seed`.

### Docker (Makefile wraps docker compose)
The full stack also runs in Docker — two services, `app` (Laravel on :8000) and `vite` (assets on :5173). The `Makefile` is the entry point; targets run inside the containers:
- `make setup` — build images (no cache) and start detached. `make up`/`make dev` — foreground; `make down` — detached; `make clean` — stop and drop volumes.
- `make test` (PHP/Pest), `make test-js` (Vitest once), `make test-coverage` (PHP with the coverage gate), `make test-js-coverage` (Vitest with the coverage gate), `make lint`, `make type-check` — run the suites inside the containers. The `app` image includes PCOV so PHP coverage works out of the box.
- `make knip`, `make knip-fix`, `make unused`, `make unused-fix`, `make unused-fix-dangerous`, `make cleanup` — the unused-code commands above, run inside the `vite` container (run `make npm-install` once after pulling, since knip is a new dependency).
- `make storybook` (foreground) / `make storybook-d` (detached) / `make storybook-stop` / `make logs-storybook` — Storybook in its own `storybook` container (profile `storybook`, :6006; not part of `make up`). `make storybook-build` and `make test-stories` run the static build and the stories-as-tests inside it.
- `make shell` (app shell), `make tinker`, `make migrate`, `make fresh` (migrate:fresh --seed), `make logs`.
- `make npm-install` / `make composer-install` — run after adding/updating/removing an npm or composer package (including via a branch merge). `node_modules`/`vendor` are anonymous volumes, so a plain `make up`/`make dev` reuses the stale ones already inside the container image; these targets rebuild the relevant image and recreate its container with `--renew-anon-volumes` to pick up the new dependencies.
- `backup` service — snapshots `database/database.sqlite` (consistent `sqlite3 .backup`, integrity-checked, source mounted read-only) into `./backup` every `BACKUP_INTERVAL` seconds (default 3600), keeping the newest `BACKUP_KEEP` (48) plus one per day for `BACKUP_KEEP_DAILY` (30) days in `backup/daily/`. `make backup-now` takes a snapshot immediately. Set `BACKUP_DIR` to another drive to keep copies off the project disk; the container starts as root only to chown that directory, then runs as the owner of `database/database.sqlite` (override with `BACKUP_UID`/`BACKUP_GID`). `make test-backup` runs the script's regression tests. Restore by stopping the stack and copying a snapshot over `database/database.sqlite` (never `migrate:fresh`). Timestamps are UTC (container clock). Script: `docker/backup/backup.sh`.
- Uses `.env.docker` for container config.

## Architecture

### Backend: layered Controller → Service → Repository
Every domain (Issue, Project, User, ActivityLog) follows the same three-layer split, wired via constructor injection:
- **Controllers** (`app/Http/Controllers/`) — thin. Validate the request, delegate to a Service, return an Inertia response or `redirect()->back()`. Mutating routes (`issues.store`, `issues.update`) return a redirect; Inertia re-fetches and re-renders the page props.
- **Services** (`app/Services/`) — business logic. This is where cross-cutting concerns live, e.g. `IssueService::createIssue` stamps `user_id` from `auth()` and writes an `ActivityLog` via the injected `ActivityLogService`. Services orchestrate other services.
- **Repositories** (`app/Repositories/`) — all Eloquent query logic (eager-loading, ordering, pagination, aggregations). Controllers/Services never build queries directly.

When adding a feature, keep this separation: query code goes in the Repository, orchestration/side-effects in the Service, validation/HTTP in the Controller.

### Frontend: Inertia pages + atomic-design components
- Entry: `resources/js/app.tsx` bootstraps Inertia. Pages resolve from `resources/js/Pages/**/*.tsx` by name (e.g. controller `Inertia::render('Dashboard', [...])` → `Pages/Dashboard.tsx`). Page props are the array passed from the controller — types them inline in the page component.
- Components use **atomic design**: `Components/Atoms/`, `Components/Molecules/`, `Components/Organisms/`. Each component lives in its own folder (`Button/Button.tsx`, colocated `Button/Button.test.tsx`). Compose upward — Organisms use Molecules use Atoms.
- Path alias `@/` → `resources/js/` (configured in `tsconfig.json` and Vite).
- **Command palette** (`mod+k`): every action is a `Command` (`types/Commands.ts`) registered with `useCommands()`; a keybinding is just its optional `shortcut`, and app-wide commands live in `hooks/useGlobalCommands.ts`. Run a command from a button with `useCommandPalette().runCommand('<id>')`, not the deprecated `triggerShortcut()`. Issue/project/people search goes through the one internal `GET /command-palette/search` endpoint, scoped to the user's memberships. See `documentation/en/command-palette/`.
- Shared prop/domain types live in `resources/js/types/` (`Issues.ts`, `Projects.ts`, `Users.ts`, `Components.ts`).
- Utilities in `resources/js/utils/`: `cn.ts` (clsx + tailwind-merge — use it to merge Tailwind classes), plus `colors.ts`, `time.ts`.

### Storybook
Every component has a colocated `X.stories.tsx` (`title: 'Atoms|Molecules|Organisms/X'`). Config is in `.storybook/` (own Vite config aliasing `@inertiajs/react` and `axios` to `.storybook/mocks/`; `withOrbitApp` decorator wraps stories in the app's real providers; toolbar theme dark/light + accent drive `ThemeProvider`/`AccentProvider`). Stories get page props via `parameters.inertia` and HTTP answers via `parameters.network`; shared sample data is `resources/js/stories/fixtures.ts`. Each layer's stories run as Vitest tests (`resources/js/stories/*.stories.test.tsx`) and are excluded from the coverage gate. See `documentation/en/storybook/`.

### Styling
- Tailwind CSS. Class-variance-authority (`cva`) + `cn()` for component variants.
- Theme is **dark-only**, driven by CSS custom properties consumed in Tailwind as arbitrary values, e.g. `bg-[var(--bg-color)]`, `text-[var(--accent-color)]`. Use these variables rather than hardcoding colors.
- Icons come from `lucide-react`, wrapped by `Components/Atoms/Icon`.

## Testing

Two independent suites:
- **PHP (Pest)** in `tests/` — `Feature/` tests extend `TestCase` with `RefreshDatabase` (see `tests/Pest.php`) and run against an in-memory SQLite DB (`phpunit.xml`). The permissions are seeded once when the test database is built (`TestCase::$seed`), not before each test, so a test must not assume it starts from an empty `permissions` table; each test still rolls back its own changes. Coverage spans Models (`tests/Feature/Models/`), Repositories, Services and Controllers.
- **React (Vitest + Testing Library)** — jsdom environment, globals enabled, setup in `resources/js/tests/setup.ts` (config in `vite.config.js`). Test files are colocated with components as `*.test.tsx`.
  - Vitest runs with `pool: 'vmThreads'`: every test file gets its own VM context inside a long-lived worker thread rather than a fresh process, which roughly halves the run (creating jsdom per file was the biggest cost). Test files stay fully isolated, but a new test that needs a missing jsdom API must polyfill it in `setup.ts` (see the `window.performance.getEntriesByType` one). In CI, `maxWorkers` is set to every available core.

### CI coverage gate
Both suites run with coverage in CI (`.github/workflows/ci.yml`) and fail the build below a threshold:
- Frontend: thresholds are configured directly in `vite.config.js` (`test.coverage.thresholds`) — currently 80% statements/functions/lines, 75% branches.
- Backend: the threshold is the `--min` flag on the `test-coverage` composer script — currently 90%. PHP coverage requires a driver (PCOV in CI and in the Docker `app` image; install PCOV or Xdebug locally to run `composer test-coverage` outside Docker).

When adding a feature, add tests alongside it rather than relying on the gate to catch gaps after the fact — the gate is a regression floor, not a substitute for reviewing your own coverage.

## Conventions
- `Issue.labels` is a plain array cast, stored as JSON. Label names are not a fixed backend enum — each project has its own `Label` records (see `App\Models\Label`/`App\Services\LabelService`), and a name is validated per request against that project's real `labels` table rows (`documentation/en/labels/`).
- oxfmt (`.oxfmtrc.json`) is configured with single quotes and auto-organizes imports + Tailwind class ordering; run `npm run format` before committing. `.githooks/pre-push` runs `oxfmt --check` and blocks unformatted pushes; enable it once per clone with `npm run hooks:install`.

- **Issue identity is two-part.** `issues.id` is the global primary key used for routes, relations, `<!-- orbit-issue:ID -->` PR markers and `#[title](id)` comment tokens; `issues.number` is the project-scoped number users see as `#12` (assigned in `Issue::booted()` from `projects.next_issue_number`, unique per `(project_id, number)`, never reused). Show/search/log/notify/branch-name `#N` text uses `number`; links and lookups use `id`. Issues that predate the column have `number = id`, so old `#N` references stay valid.

## Documentation

`documentation/` holds step-by-step, copy-pasteable "how do I extend X" guides, split into two language folders, `documentation/en/` and `documentation/pl/`, mirroring the same structure and file names — see `documentation/README.md` for the language index and the en/pl sync rule, and `documentation/en/integrations/` (+ its `documentation/pl/integrations/` translation) for a fully worked example (adding an integration, a permission, integration settings, and a brand-new event type).

**Whenever you build something genuinely new** — a new subsystem, a new extensibility point ("plug a new X in here"), a new category of permission, a new event-driven flow, or anything else future work would otherwise have to reverse-engineer from a diff — add a guide under `documentation/en/<category>/` (create the category folder + its own `README.md` index if one doesn't exist yet) **and** its Polish translation at the matching path under `documentation/pl/<category>/` before considering the feature done — code blocks/paths stay verbatim in English in both. Small changes to existing, already-documented extension points don't need a new guide.

## Troubleshooting

### Vite HMR not working in Docker

If the Vite dev server stops hot-reloading and you see WebSocket errors in the browser console, the file watcher has likely become stale or desynced from the filesystem.

Note this is *not* fixed via an inotify limit bump: `fs.inotify.max_user_watches` is a global (non-namespaced) kernel sysctl, so Docker refuses to start a container with it set per-service (see the commented-out `sysctls` block in `docker-compose.yml` — leave it disabled). The only mechanism actually in effect is `vite.config.js`'s `server.watch.usePolling` (polling instead of native `fs.watch`/inotify), which is more reliable across Docker bind mounts but can still drift out of sync after enough file churn, especially if the repo lives on non-native storage (e.g. an external/removable drive). A container restart forces a fresh full re-scan.

**Fix**: if restarting the container is the only option:

```bash
make down
make up
```

If the problem persists after rebuild:

```bash
make clean
make setup
```

This rebuilds the images fresh and clears any stale module cache.
