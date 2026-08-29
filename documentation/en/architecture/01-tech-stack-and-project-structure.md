# Tech stack and project structure

The root [`README.md`](../../../README.md#tech-stack) has the
headline stack table (PHP/Laravel, Inertia, React/TypeScript/Vite,
Tailwind, SQLite, Pest/Vitest). This guide goes one level deeper: every
real dependency in `composer.json`/`package.json` and what it's
actually used for, plus a fuller directory map than the root README's
summary.

## Backend dependencies (`composer.json`)

| Package | What it's for |
|---|---|
| `laravel/framework` (^13.8) | The framework itself |
| `inertiajs/inertia-laravel` | Server-side half of Inertia — renders React pages with props instead of returning JSON/Blade |
| `laravel/sanctum` | Present, **not used anywhere** — see [`05-scope-and-non-goals.md`](./05-scope-and-non-goals.md) |
| `laravel/tinker` | The `php artisan tinker` REPL, used throughout this doc set for one-off checks |
| `sentry/sentry-laravel` | Backend error monitoring — reports uncaught exceptions to Sentry when `SENTRY_LARAVEL_DSN` is set |
| `tightenco/ziggy` | Generates a JS `route()` helper from the backend's named routes — every frontend `route('projects.show', ...)` call you've seen throughout `documentation/` comes from this, not a hand-maintained URL map |

## Frontend dependencies (`package.json`)

| Package | What it's for |
|---|---|
| `@inertiajs/react` | Client-side half of Inertia — `usePage()`, `router`, `<Link>` |
| `react` / `react-dom` (19) | The UI layer |
| `typescript` / `vite` | Language + bundler/dev-server |
| `tailwindcss` (3.x) + `@tailwindcss/forms` + `@tailwindcss/typography` | Utility CSS, form-element resets, and the `.prose` styles used for rendered markdown (see `global.css`'s `--tw-prose-*` token overrides) |
| `class-variance-authority` | Typed Tailwind variant builders — see any `cva(...)` call, e.g. `Alert.tsx`'s `alertVariants`/`iconVariants` |
| `tailwind-merge` | Powers `cn()` (`resources/js/utils/cn.ts`) — merges conflicting Tailwind classes so a later class properly overrides an earlier one, unlike a plain template-string join |
| `tailwind-scrollbar` | The `.no-scrollbar` utility and related scrollbar styling |
| `lucide-react` | Every icon in the app, wrapped by `Components/Atoms/Icon` |
| `framer-motion` | Every enter/exit animation — e.g. the alert stack's `AnimatePresence` (see `AlertContainer.tsx`) |
| `class-variance-authority`, `@headlessui/react` | Accessible unstyled primitives (dropdowns/dialogs) underneath some Atoms/Molecules |
| `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-*`, `tiptap-markdown` | The rich-text issue-description/comment editor — see `Components/Molecules/EditableMarkdown` and [`../rich-text-editor/README.md`](../rich-text-editor/README.md) |
| `react-markdown` + `remark-gfm` | Renders **read-only** markdown (e.g. an integration's `overview` field in the catalog modal) — a different code path from Tiptap, which is for *editing* |
| `@dnd-kit/core` + `@dnd-kit/utilities` | Drag-and-drop, e.g. moving a card between columns on the Kanban board view |
| `@sentry/react` | Frontend error monitoring — initialized in `app.tsx`, reports uncaught frontend exceptions when `VITE_SENTRY_DSN` is set |
| `axios` | HTTP client Inertia's `router` uses under the hood — rarely called directly |
| `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` | The frontend test stack |
| `eslint*`, `prettier*` | Linting/formatting — `prettier-plugin-tailwindcss` auto-sorts Tailwind classes, `prettier-plugin-organize-imports` auto-sorts imports |

## The directory map, one level deeper than the root README

```
app/
  Http/Controllers/     Thin: validate, delegate to a Service, redirect/render
  Http/Middleware/      HandleInertiaRequests (shared props — see guide 3)
  Http/Requests/        Form Request validation classes (e.g. UpdateNotificationSettingsRequest)
  Services/             Business logic, orchestration, side effects
  Services/Integrations/ Per-integration IntegrationNotifier implementations + the registry
  Repositories/         All Eloquent query logic — controllers/services never build queries directly
  Policies/             Gate-backed authorization, resolved permission sets
  Models/               Eloquent models
  Enums/                Plain domain enums (IssueLabel)
  Enums/Permissions/    RoleType, Permission
  Enums/Notifications/  NotificationType, NotificationChannel
  Events/               Immutable domain facts, fired unconditionally
  Listeners/            Independent consumers of the same events
  Jobs/                 Queued work (webhook delivery, ...)
  Contracts/            Interfaces implemented by multiple concrete classes (IntegrationNotifier)
  Notifications/        Laravel Notification classes (mail-sending)
  Providers/             AppServiceProvider — event registration, rate limiters, container bindings

resources/js/
  Pages/                One file per Inertia page, resolved by dotted/slashed name
  Components/Atoms/     Smallest building blocks — no business logic, take primitive props
  Components/Molecules/ Composed from Atoms — a small, reusable, still-generic unit
  Components/Organisms/ Composed from Molecules — feature-specific, often reads context/props directly
  Layouts/               Page shells (sidebar + top nav, etc.)
  context/               React context providers, one per cross-cutting concern
  hooks/                 Reusable stateful logic not tied to one component
  types/                 Shared TypeScript types, usually mirroring a backend model/enum
  utils/                 Pure functions — color maps, formatting, class merging

resources/css/
  global.css             Theme tokens (see documentation/en/theme-colors/), Tailwind layers, misc global rules

resources/views/
  app.blade.php          The one Blade template Inertia renders into — see guide 3
  emails/                Blade views for transactional email content

database/
  migrations/            Schema history
  factories/             Model factories (tests + seeder)
  seeders/               Demo data generator

routes/
  web.php                Authenticated app routes
  auth.php               Guest-only login/register + logout
  account.php            /account/* routes (notification settings, ...)

documentation/
  en/, pl/               This whole guide set — bilingual, same structure/filenames in both
```

## Tests

This guide is reference material, not something with its own behavior
to test.
