# Stack technologiczny i struktura projektu

Główny [`README.md`](../../../README.md#tech-stack) ma sztandarową tabelę stacku (PHP/Laravel, Inertia, React/TypeScript/Vite, Tailwind, SQLite, Pest/Vitest). Ten przewodnik schodzi o poziom głębiej: każda prawdziwa zależność w `composer.json`/`package.json` i do czego faktycznie służy, plus pełniejsza mapa katalogów niż podsumowanie w głównym README.

## Zależności backendu (`composer.json`)

| Pakiet | Do czego służy |
|---|---|
| `laravel/framework` (^13.8) | Sam framework |
| `inertiajs/inertia-laravel` | Serwerowa połowa Inertii — renderuje strony React z propami zamiast zwracać JSON/Blade |
| `laravel/sanctum` | Obecny, **nigdzie nieużywany** — zobacz [`05-scope-and-non-goals.md`](./05-scope-and-non-goals.md) |
| `laravel/tinker` | REPL `php artisan tinker`, używany w całym tym zestawie dokumentacji do jednorazowych sprawdzeń |
| `sentry/sentry-laravel` | Monitoring błędów backendu — raportuje nieprzechwycone wyjątki do Sentry, gdy ustawiony jest `SENTRY_LARAVEL_DSN` |
| `tightenco/ziggy` | Generuje helper JS `route()` z nazwanych tras backendu — każde wywołanie `route('projects.show', ...)` na froncie, jakie widziałeś w całej `documentation/`, pochodzi stąd, nie z ręcznie utrzymywanej mapy URL-i |

## Zależności frontendu (`package.json`)

| Pakiet | Do czego służy |
|---|---|
| `@inertiajs/react` | Kliencka połowa Inertii — `usePage()`, `router`, `<Link>` |
| `react` / `react-dom` (19) | Warstwa UI |
| `typescript` / `vite` | Język + bundler/dev-server |
| `tailwindcss` (3.x) + `@tailwindcss/forms` + `@tailwindcss/typography` | Utility CSS, resety elementów formularzy oraz style `.prose` używane do renderowanego markdownu (zobacz nadpisania tokenów `--tw-prose-*` w `global.css`) |
| `class-variance-authority` | Otypowane budowniczowie wariantów Tailwinda — zobacz dowolne wywołanie `cva(...)`, np. `alertVariants`/`iconVariants` w `Alert.tsx` |
| `tailwind-merge` | Napędza `cn()` (`resources/js/utils/cn.ts`) — łączy konfliktujące klasy Tailwinda tak, żeby późniejsza klasa poprawnie nadpisywała wcześniejszą, w przeciwieństwie do zwykłego złączenia stringów szablonowych |
| `tailwind-scrollbar` | Utility `.no-scrollbar` i powiązane stylowanie scrollbara |
| `lucide-react` | Każda ikona w aplikacji, owinięta przez `Components/Atoms/Icon` |
| `framer-motion` | Każda animacja wejścia/wyjścia — np. `AnimatePresence` stosu alertów (zobacz `AlertContainer.tsx`) |
| `class-variance-authority`, `@headlessui/react` | Dostępne, niestylowane prymitywy (dropdowny/dialogi) pod niektórymi Atoms/Molecules |
| `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-*`, `tiptap-markdown` | Edytor rich-text dla opisu issue/komentarzy — zobacz `Components/Molecules/EditableMarkdown` i [`../rich-text-editor/README.md`](../rich-text-editor/README.md) |
| `react-markdown` + `remark-gfm` | Renderuje markdown **tylko do odczytu** (np. pole `overview` integracji w modalu katalogu) — inna ścieżka kodu niż Tiptap, który jest do *edycji* |
| `@dnd-kit/core` + `@dnd-kit/utilities` | Drag-and-drop, np. przenoszenie karty między kolumnami w widoku tablicy Kanban |
| `@sentry/react` | Monitoring błędów frontendu — inicjalizowany w `app.tsx`, raportuje nieprzechwycone wyjątki frontendu, gdy ustawiony jest `VITE_SENTRY_DSN` |
| `axios` | Klient HTTP, którego `router` Inertii używa pod spodem — rzadko wywoływany bezpośrednio |
| `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` | Stack testów frontendu |
| `eslint*`, `prettier*` | Linting/formatowanie — `prettier-plugin-tailwindcss` automatycznie sortuje klasy Tailwinda, `prettier-plugin-organize-imports` automatycznie sortuje importy |

## Mapa katalogów, o poziom głębiej niż w głównym README

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

## Testy

Ten przewodnik to materiał referencyjny, nie coś z własnym zachowaniem do przetestowania.
