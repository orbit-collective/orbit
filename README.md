<img width="1672" height="941" alt="Orbit Banner" src="https://github.com/user-attachments/assets/c5b62d87-e641-4dd3-905c-011028c1ac7e" />

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
workflow, and see progress on a dashboard — as a List, a Kanban Board, a
Calendar, or an Activity feed. It's a single Laravel + Inertia.js + React
monolith, so there's no separate API to stand up.

## Features

- **Projects & issues** — projects with name/color/description; issues with
  title, description, status, priority, labels, assignee, and dates.
- **Four views** of the same data — table, board, calendar, activity feed —
  plus configurable columns and saved filters, per project.
- **A dashboard** with productivity trends and completion ratios.
- **Notifications** — nine event types, each independently toggleable for
  in-app and email delivery.
- **Project-scoped roles & permissions** — no global admin; Owner/Admin/
  Member/Viewer system tiers plus custom roles, backed by 30 fine-grained
  permissions.
- **Integrations** — a catalog of third-party tools per project (Discord
  live today, via queued webhooks); see
  [`documentation/en/integrations/`](documentation/en/integrations/) for how
  to add another.
- **Account settings** (`/settings`) — profile, security, preferences,
  notifications, and workspace management (members, roles, integrations).
- **Light/dark/system theme** with 10 accent colors, persisted per browser.
- **Guided onboarding** for new accounts.

## Tech stack

| Layer    | Technology                                                             |
|----------|------------------------------------------------------------------------|
| Backend  | PHP 8.5+, Laravel 13                                                   |
| Bridge   | Inertia.js 3 (no REST/JSON API — Laravel renders React pages directly) |
| Frontend | React 19, TypeScript, Vite                                             |
| Styling  | Tailwind CSS, `class-variance-authority`, light/dark/system theming    |
| Database | SQLite by default (swappable via Laravel's standard `DB_*` env vars)   |
| Testing  | Pest (PHP), Vitest + Testing Library (React)                           |

The backend follows a layered **Controller → Service → Repository**
architecture. The frontend follows **atomic design** (Atoms, Molecules,
Organisms) composing into Inertia pages under `resources/js/Pages`.

## Getting started

### Docker (recommended)

Needs [Docker](https://www.docker.com/) and `make`.

```bash
git clone https://github.com/Adiksuu/orbit.git
cd orbit
make setup
```

This builds the images and starts the stack. `.env` is created and an
`APP_KEY` generated automatically on first run (or Doppler is used instead,
if this directory is linked to it — see
[`documentation/`](documentation/) for details).

| Service           | URL                    |
|--------------------|------------------------|
| App                | http://localhost:8000  |
| Vite (assets/HMR)  | http://localhost:5173  |
| nsfwjs (moderation)| http://localhost:3333  |

Common commands (see the `Makefile` for the full list):

```bash
make up / make down    # start (foreground) / stop the stack
make shell / make tinker
make migrate / make fresh   # run migrations / rebuild with seed data
make test / make test-js    # PHP / frontend test suites
make lint / make type-check
```

### Native (PHP + Node directly)

Needs PHP 8.5+, Composer, and Node.js.

```bash
git clone https://github.com/Adiksuu/orbit.git
cd orbit
composer setup   # installs deps, copies .env, migrates, builds assets
php artisan migrate:fresh --seed   # optional: seed demo data
composer dev      # runs the server, queue listener, log tail, and Vite together
```

## Testing

```bash
composer test       # PHP (Pest) suite
npm test             # Frontend (Vitest) suite
```

CI runs type-checking, linting, both test suites, and a production build on
every push and pull request against `master`.

## Project structure

```
app/
  Http/Controllers/   Thin HTTP layer — validate, delegate, redirect
  Services/            Business logic and side effects
  Repositories/        All Eloquent query logic
  Policies/            Permission- and project-membership-based authorization
  Models/               Issue, Project, User, Role, ProjectIntegration, ...

resources/js/
  Pages/                Inertia pages, resolved by name
  Components/           Atoms / Molecules / Organisms (atomic design)
  Layouts/              Page shells (MainLayout, GuestLayout)
  types/                Shared TypeScript types

documentation/
  en/, pl/              Step-by-step "how do I extend X" guides (bilingual)
```

See [`CLAUDE.md`](CLAUDE.md) and [`documentation/`](documentation/) for a
deeper dive into architecture and conventions.

## Deploying to production

Orbit is a standard Laravel + Vite app: build assets (`npm run build`),
install PHP deps without dev packages, point `DB_*` at a real database,
migrate (`php artisan migrate --force`), cache config/routes/views, and
serve `public/` behind Nginx/Apache or the Docker image's `php` target.
Run a queue worker (`php artisan queue:work`) if you rely on queued jobs
(email notifications, integration webhooks).

## License

Licensed under the [MIT License](LICENSE).

[![Adiksuu/orbit contributors](https://shieldcn.dev/contributors/Adiksuu/orbit.svg?preset=grid&bots=true&align=left&mode=dark)](https://github.com/Adiksuu/orbit/graphs/contributors)
