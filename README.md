![Orbit](https://shieldcn.dev/header/grid.svg?title=Orbit&subtitle=Create+projects%2C+track+issues+through+a+workflow%2C+and+see+progress+on+a+dashboard&logo=ri%3AFaProjectDiagram&size=wide&mode=dark&align=left&image=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1614850523459-c2f4c699c52e%3Fw%3D1600%26q%3D70%26fit%3Dcrop%26fm%3Djpg&overlay=1)
<picture><source media="(prefers-color-scheme: dark)" srcset="https://www.shieldcn.dev/github/last-commit/Adiksuu/orbit.svg?variant=secondary&amp;size=sm&amp;mode=dark"><img alt="Last commit" src="https://www.shieldcn.dev/github/last-commit/Adiksuu/orbit.svg?variant=secondary&amp;size=sm&amp;mode=light"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="https://www.shieldcn.dev/github/commits/Adiksuu/orbit.svg?variant=secondary&amp;size=sm&amp;mode=dark"><img alt="Commits" src="https://www.shieldcn.dev/github/commits/Adiksuu/orbit.svg?variant=secondary&amp;size=sm&amp;mode=light"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="https://www.shieldcn.dev/github/closed-prs/Adiksuu/orbit.svg?variant=ghost&amp;size=sm&amp;mode=dark"><img alt="Closed PRs" src="https://www.shieldcn.dev/github/closed-prs/Adiksuu/orbit.svg?variant=ghost&amp;size=sm&amp;mode=light"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="https://www.shieldcn.dev/github/ci/Adiksuu/orbit.svg?variant=secondary&amp;size=sm&amp;mode=dark"><img alt="CI" src="https://www.shieldcn.dev/github/ci/Adiksuu/orbit.svg?variant=secondary&amp;size=sm&amp;mode=light"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="https://www.shieldcn.dev/github/license/Adiksuu/orbit.svg?variant=ghost&amp;size=sm&amp;mode=dark"><img alt="License" src="https://www.shieldcn.dev/github/license/Adiksuu/orbit.svg?variant=ghost&amp;size=sm&amp;mode=light"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="https://www.shieldcn.dev/badge/Package_mgr-npm-CB3837.svg?logo=npm&amp;variant=branded&amp;size=sm&amp;mode=dark"><img alt="Package mgr · npm" src="https://www.shieldcn.dev/badge/Package_mgr-npm-CB3837.svg?logo=npm&amp;variant=branded&amp;size=sm&amp;mode=light"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="https://www.shieldcn.dev/badge/Container-Docker-2496ED.svg?logo=docker&amp;variant=branded&amp;size=sm&amp;mode=dark"><img alt="Container · Docker" src="https://www.shieldcn.dev/badge/Container-Docker-2496ED.svg?logo=docker&amp;variant=branded&amp;size=sm&amp;mode=light"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="https://www.shieldcn.dev/badge/Language-TypeScript-3178C6.svg?logo=typescript&amp;variant=branded&amp;size=sm&amp;mode=dark"><img alt="Language · TypeScript" src="https://www.shieldcn.dev/badge/Language-TypeScript-3178C6.svg?logo=typescript&amp;variant=branded&amp;size=sm&amp;mode=light"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="https://www.shieldcn.dev/badge/Lint-ESLint-4B32C3.svg?logo=eslint&amp;variant=branded&amp;size=sm&amp;mode=dark"><img alt="Lint · ESLint" src="https://www.shieldcn.dev/badge/Lint-ESLint-4B32C3.svg?logo=eslint&amp;variant=branded&amp;size=sm&amp;mode=light"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="https://www.shieldcn.dev/badge/Format-Prettier-F7B93E.svg?logo=prettier&amp;variant=branded&amp;size=sm&amp;mode=dark"><img alt="Format · Prettier" src="https://www.shieldcn.dev/badge/Format-Prettier-F7B93E.svg?logo=prettier&amp;variant=branded&amp;size=sm&amp;mode=light"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="https://www.shieldcn.dev/badge/Bundler-Vite-646CFF.svg?logo=vite&amp;variant=branded&amp;size=sm&amp;mode=dark"><img alt="Bundler · Vite" src="https://www.shieldcn.dev/badge/Bundler-Vite-646CFF.svg?logo=vite&amp;variant=branded&amp;size=sm&amp;mode=light"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="https://www.shieldcn.dev/badge/CSS-Tailwind-06B6D4.svg?logo=tailwindcss&amp;variant=branded&amp;size=sm&amp;mode=dark"><img alt="CSS · Tailwind" src="https://www.shieldcn.dev/badge/CSS-Tailwind-06B6D4.svg?logo=tailwindcss&amp;variant=branded&amp;size=sm&amp;mode=light"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="https://www.shieldcn.dev/badge/Stack-React-61DAFB.svg?logo=react&amp;variant=ghost&amp;size=sm&amp;mode=dark&amp;theme=purple"><img alt="React" src="https://www.shieldcn.dev/badge/Stack-React-61DAFB.svg?logo=react&amp;variant=ghost&amp;size=sm&amp;mode=light&amp;theme=purple"></picture>
# Orbit

Orbit is an issue and project tracker: create projects, track issues through a
workflow, and see progress on a dashboard — as a List, a Kanban Board, or a
Calendar, whichever fits the moment. It's built as a single Laravel +
Inertia.js + React monolith, so there's no separate API to stand up and no
client/server version drift to manage.

## What's inside

- **Projects** with a name, color, description, and a slug-based URL. Each
  project has its own issue list, board, and calendar view.
- **Issues** with title, description, status, priority (high / medium / low),
  labels (bug, feature, performance, design, ux, chore), an assignee, a
  creator, and optional start/end dates.
- **Three ways to look at the same data**: a sortable, searchable, paginated
  table; a status-grouped board; and a calendar laid out by issue dates. Your
  last choice is remembered per browser.
- **Configurable table columns** — toggle which issue fields show up in the
  list view, saved per project.
- **Saved filters** — store a named combination of search/label/status/
  priority/assignee filters per project and reapply it later.
- **A dashboard** with productivity trends, priority breakdowns, and
  completion ratios across every project.
- **An activity log** recording who did what, so project history isn't lost.
- **In-app notifications**, scoped per user and markable as read individually
  or all at once.
- **Accounts with roles** — anyone can register; the very first account
  becomes an admin, everyone after that registers as a member.
- **Guided onboarding**, shown once per account and tracked server-side: a
  welcome tour for every new user, followed by a dedicated "create your first
  project" flow for the first (admin) account when the workspace is empty.

## Tech stack

| Layer      | Technology                                                |
| ---------- | ---------------------------------------------------------- |
| Backend    | PHP 8.4+, Laravel 13                                       |
| Bridge     | Inertia.js 3 (no REST/JSON API — Laravel renders React pages directly) |
| Frontend   | React 19, TypeScript, Vite                                 |
| Styling    | Tailwind CSS (dark theme only), `class-variance-authority` |
| Database   | SQLite by default (swappable via Laravel's standard `DB_*` env vars) |
| Testing    | Pest (PHP), Vitest + Testing Library (React)                |

The backend follows a layered **Controller → Service → Repository**
architecture: controllers stay thin (validate, delegate, redirect),
services own business logic and side effects (like writing to the
activity log), and repositories own every Eloquent query. The frontend
follows **atomic design** — Atoms, Molecules, and Organisms compose upward
into the Inertia pages under `resources/js/Pages`.

## Getting started

There are two ways to run Orbit: **Docker**, which needs nothing but Docker
itself installed, or a **native setup**, which needs PHP, Composer, and
Node.js on your machine but skips the container layer entirely. Either one
gets you a fully working local instance with its own SQLite database.

### Option A — Docker (recommended)

You'll need [Docker](https://www.docker.com/) and `make`. Doppler is
optional: the team uses [Doppler](https://www.doppler.com/) to manage the
Docker stack's environment variables, but you don't need an account or the
Doppler CLI just to run the project locally — see
[Environment configuration](#environment-configuration) for exactly how the
two paths differ and when you'd want each.

```bash
git clone https://github.com/Adiksuu/orbit.git
cd orbit
make setup
```

`make setup` builds the images and starts the stack in the background. Every
`make` target that needs environment variables runs an `ensure-env` step
first: if this directory isn't linked to a Doppler config (`doppler setup`
was never run here), it transparently copies `.env.example` to `.env` and
generates a fresh `APP_KEY` on first run — no manual step required. If the
directory *is* linked to Doppler, that step is skipped and Doppler is the
source of truth instead, exactly as before.

Once it's up:

| Service          | URL                     |
| ---------------- | ----------------------- |
| App (Laravel)    | http://localhost:8000   |
| Vite (assets/HMR)| http://localhost:5173   |

Useful commands from here (see the `Makefile` for the full list):

```bash
make up               # start in the foreground (Ctrl+C to stop)
make up-d             # start in the background
make down             # stop the stack
make build            # rebuild the images
make npm-install      # run after adding/updating/removing an npm package
make logs             # tail logs from every service
make shell            # open a shell in the app container
make tinker           # open the Laravel tinker REPL
make migrate          # run new migrations
make fresh            # drop and re-migrate with seed data
make test             # run the PHP (Pest) suite
make test-coverage    # run the PHP suite with the coverage gate
make test-js          # run the frontend (Vitest) suite
make test-js-coverage # run the frontend suite with the coverage gate
make lint             # lint the frontend
make type-check       # type-check the frontend
make clean            # stop the stack and remove volumes
```

If this directory is linked to Doppler, every one of these already runs
through `doppler run --`, so don't prefix them yourself.

### Option B — Native (PHP + Node directly)

You'll need PHP 8.3+, Composer, and Node.js installed locally.

```bash
git clone https://github.com/Adiksuu/orbit.git
cd orbit
composer setup
```

`composer setup` installs PHP and npm dependencies, copies `.env.example` to
`.env`, generates an app key, runs migrations, and builds the frontend
assets — a complete one-shot bootstrap.

To seed the database with demo projects, issues, users, and activity log
entries:

```bash
php artisan migrate:fresh --seed
```

Then start the full local stack — Laravel server, queue listener, log
tailing, and the Vite dev server, all together:

```bash
composer dev
```

The app is served at whatever URL `php artisan serve` prints (typically
http://localhost:8000).

## Environment configuration

This only applies to the **Docker** setup. The native setup configures
itself the normal Laravel way, through a local `.env` file copied from
`.env.example` — nothing below affects it.

For Docker, `docker-compose.yml` declares each service's environment as
`KEY: ${KEY}` — plain interpolation from whatever environment the
`docker compose` process itself is run in. There is no `.env.docker` and the
entrypoint never writes a `.env` inside the container, so where those `${KEY}`
values actually come from depends on whether this directory is linked to
[Doppler](https://www.doppler.com/):

- **Linked to Doppler** (the core team) — the `Makefile` wraps every command
  in `doppler run --`, which injects your Doppler config's secrets straight
  into the `docker compose` process. Doppler is the sole source of truth;
  no `.env` file is read or written.
- **Not linked to Doppler** (everyone else — contributors, forks, CI-less
  local clones) — the `Makefile`'s `ensure-env` step falls back to a plain
  `.env` file at the repo root instead. `docker compose` reads that file
  automatically for `${KEY}` interpolation, no flags needed. `ensure-env`
  copies it from `.env.example` on first run and generates a fresh `APP_KEY`
  if one isn't set yet — both steps are idempotent, so subsequent runs leave
  your `.env` alone.

Either way you end up with the exact same set of variables reaching the
containers; only where they're sourced from differs. You never need to
choose explicitly — the `Makefile` detects which mode applies by checking
whether `doppler setup` has ever been run in this directory
(`doppler configure get project`).

Two behaviors worth knowing about regardless of which mode you're in:

- `php artisan serve` treats the *presence* of a `.env` file as a signal to
  filter which environment variables reach the request-handling process —
  so Docker's `CMD` runs `serve` with `--no-reload`, which disables that
  filtering and always passes the full environment through. Without it, a
  leftover `.env` (from the fallback mode, or a stray one bind-mounted in)
  would cause every HTTP request to 500 with `MissingAppKeyException` even
  though CLI commands in the same container see the correct config.
- Doppler mode wants a real `APP_KEY` in the linked config *before* your
  first `make setup`/`make up` — nothing generates one for you there, since
  the container never writes to Doppler:
  ```bash
  php artisan key:generate --show      # prints a fresh base64:... key
  doppler secrets set APP_KEY="<paste the key here>"
  ```

If you ever see `MissingAppKeyException` or other config-looking errors:
in Doppler mode, check `doppler secrets --only-names` against the
`environment:` blocks in `docker-compose.yml` for anything missing; in
fallback mode, check that `.env` actually exists and has a non-empty
`APP_KEY=base64:...` line (delete it and re-run any `make` target to
regenerate it from scratch).

## Everyday commands

### Frontend

```bash
npm run dev            # Vite dev server with HMR
npm run build           # type-check (tsc) then production build
npm run lint             # ESLint over resources/js, auto-fixing
npm test                 # Vitest in watch mode
npm run test:watch       # explicit watch mode
npm run test:coverage    # Vitest with coverage
```

Run a single frontend test:

```bash
npx vitest run resources/js/Components/Atoms/Button/Button.test.tsx -t "test name"
```

### Backend

```bash
composer test                                  # clears config, then runs the Pest suite
php artisan test --filter=IssueServiceTest      # run a single PHP test
php artisan migrate                             # apply new migrations
php artisan migrate:fresh --seed                # rebuild the schema with demo data
```

## Deploying to production

Orbit is a standard Laravel application, so it deploys the same way any
Laravel + Vite app does. The Dockerfile's `php` target is production-ready
as a starting point; adapt the steps below to whatever host you use
(a VPS, Forge, Vapor, Fly.io, Railway, a Kubernetes cluster — anything that
can run PHP-FPM/Nginx or Docker).

1. **Provide a real database.** SQLite is convenient for local development,
   but for production point `DB_CONNECTION` at MySQL or PostgreSQL (or keep
   SQLite if your traffic and durability needs are modest — Laravel supports
   it natively either way) and set the matching `DB_*` variables.
2. **Set production environment variables.** Copy `.env.example`, set
   `APP_ENV=production`, `APP_DEBUG=false`, a real `APP_URL`, and generate a
   fresh `APP_KEY` with `php artisan key:generate`. Never reuse a local
   `.env` in production.
3. **Install dependencies for production.**
   ```bash
   composer install --no-dev --optimize-autoloader
   npm ci
   npm run build
   ```
   `npm run build` type-checks and produces the hashed, minified assets in
   `public/build` that Laravel's Vite integration serves — there is no
   separate frontend deploy step or Vite dev server in production.
4. **Migrate the database.**
   ```bash
   php artisan migrate --force
   ```
5. **Cache framework config for performance.**
   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```
6. **Serve the app.** Point a real web server (Nginx or Apache with
   PHP-FPM) at the `public/` directory, or run the container image built
   from the `php` target in `Dockerfile` behind a reverse proxy. Run a queue
   worker (`php artisan queue:work`) if you rely on queued jobs, and put a
   process supervisor (systemd, Supervisor, or your platform's process
   manager) in front of both.

Because Orbit has no separate API, there's nothing extra to deploy or version
— one Laravel deployment serves both the pages and the assets.

## Testing

Two independent test suites cover the app:

- **PHP (Pest)** — `tests/Feature` extends the base `TestCase` with
  `RefreshDatabase` and runs against an in-memory SQLite database. Coverage
  focuses on the Service and Repository layers per domain (Issue, Project,
  User, ActivityLog).
- **React (Vitest + Testing Library)** — jsdom environment with global test
  APIs enabled. Test files sit next to the component they cover, e.g.
  `Button/Button.test.tsx`.

Continuous integration runs type-checking, linting, both test suites, and a
production build on every push and pull request against `master`.

## Project structure

```
app/
  Http/Controllers/   Thin HTTP layer — validate, delegate, redirect
  Services/           Business logic and side effects (activity logging, etc.)
  Repositories/       All Eloquent query logic
  Models/             Issue, Project, User, Notification, SavedFilter, ActivityLog
  Enums/              IssueLabel, UserRole

resources/js/
  Pages/              Inertia pages, resolved by name (Dashboard, Projects/Show, Auth/Login, ...)
  Components/
    Atoms/            Smallest building blocks (Button, Badge, Input, ...)
    Molecules/         Composed from atoms (BoardColumn, IssueRowDetail, ...)
    Organisms/         Composed from molecules (IssueBoard, IssueTable, CalendarView, ...)
  Layouts/            Page shells (sidebar, top nav, ...)
  context/            React context providers (alerts, global modal, keyboard shortcuts)
  hooks/              Reusable hooks (saved filters, resizable table columns, ...)
  types/              Shared TypeScript types (Issues, Projects, Users, ...)
  utils/              cn() (Tailwind class merging), colors, time helpers

database/
  migrations/         Schema history
  factories/          Model factories used by the seeder and tests
  seeders/            Demo data generator

routes/
  web.php             Authenticated application routes
  auth.php            Guest-only login/register + logout routes
```

## Conventions worth knowing

- Issue labels are stored as a cast enum array (`App\Enums\IssueLabel`) —
  add new labels there, not as free-form strings.
- Mutating routes (`issues.store`, `issues.update`, `projects.store`, ...)
  return a redirect rather than JSON; Inertia re-fetches the page props and
  re-renders, so controllers never hand-build response payloads.
- The theme is dark-only, driven by CSS custom properties consumed via Tailwind arbitrary values
  like `bg-[var(--bg-color)]`. Prefer these variables over hardcoded colors.
- Prettier (single quotes, auto-organized imports, Tailwind class sorting)
  and ESLint should both pass clean before a commit.
- Roles are a plain `App\Enums\UserRole` (`admin` / `member`), assigned at
  registration — there's no separate roles table or permissions matrix.
- Per-user flags like onboarding completion are columns on `users`, shared
  to every Inertia page via `HandleInertiaRequests` — the frontend reads
  them from `usePage().props.auth.user` rather than local/localStorage state.

## License

Licensed under the [MIT License](LICENSE).

[![Adiksuu/orbit contributors](https://shieldcn.dev/contributors/Adiksuu/orbit.svg?preset=grid&bots=true&align=left&mode=dark)](https://github.com/Adiksuu/orbit/graphs/contributors)
