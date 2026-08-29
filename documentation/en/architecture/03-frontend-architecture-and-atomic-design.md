# Frontend architecture and atomic design

## How a URL becomes a rendered page

```
Browser requests /projects/5
        │
        ▼
routes/web.php → ProjectController::show()
  - Inertia::render('Projects/Show', [ ...props ])
        │
        ▼
Inertia (server) serializes props, picks the component name 'Projects/Show'
        │
        ▼ (full page load)                          ▼ (subsequent SPA-style visit)
resources/views/app.blade.php                        Inertia (client) swaps the
  - @inertia directive renders a <div id="app">       page component in place,
    with the initial page data as a data-page attr    no full reload
        │
        ▼
resources/js/app.tsx's createInertiaApp({ resolve })
  - resolve('Projects/Show') → resolvePageComponent(...)
  - dynamically imports resources/js/Pages/Projects/Show.tsx via
    import.meta.glob('./Pages/**/*.tsx') — every .tsx file under Pages/
    is a candidate, matched by its path
        │
        ▼
<Component {...pageProps} /> renders inside the fixed provider stack (see below)
```

There is no client-side router matching URL patterns to components —
the **page name string** Laravel sends (`'Projects/Show'`) is the only
thing that decides which file renders, and it maps directly to
`resources/js/Pages/Projects/Show.tsx`'s path. Naming a new page
means creating the file at the matching path; nothing else needs
registering.

## The provider stack every page mounts under

File: `resources/js/app.tsx`

```tsx
<ThemeProvider>
    <AccentProvider>
        <ModalProvider>
            <AlertProvider>
                <ShortcutProvider>
                    <ModalContainer />
                    <Component {...pageProps} key={key} />
                    <OnboardingGate />
                </ShortcutProvider>
            </AlertProvider>
        </ModalProvider>
    </AccentProvider>
</ThemeProvider>
```

The nesting order is load-bearing, not arbitrary: `AccentProvider`
calls `useTheme()` internally (its opacity math differs per resolved
theme — see
[`../accent-colors/README.md`](../accent-colors/README.md)), so it
must sit inside `ThemeProvider`; every other provider is independent
and could in principle nest in any order relative to each other. Add
a new cross-cutting context here, at the level it needs (inside
`ThemeProvider` only if it also needs `useTheme()`, otherwise anywhere
in the stack) — not inside an individual Page or Layout, or every
other page loses access to it.

`OnboardingGate` (defined inline in `app.tsx`, not a context) reads
`auth.user`'s two onboarding flags off the shared Inertia props (see
below) and renders a blocking modal over everything else until both
are complete — see
[`../project-onboarding/README.md`](../project-onboarding/README.md).

## Shared props vs. per-page props

File: `app/Http/Middleware/HandleInertiaRequests.php`

```php
public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'auth' => [
            'user' => $request->user() ? [
                'id' => $request->user()->id,
                'name' => $request->user()->name,
                'email' => $request->user()->email,
                'avatar' => $request->user()->avatar,
                'has_completed_onboarding' => $request->user()->has_completed_onboarding,
                'has_completed_project_onboarding' => $request->user()->has_completed_project_onboarding,
                'session_lifetime' => $request->user()->session_lifetime,
            ] : null,
        ],
        'hasProjects' => fn () => $request->user()
            ? $this->projectService->hasAnyProjectsForUser($request->user()->id)
            : true,
        'emailEnabled' => fn () => $this->mailConfigurationService->isEnabled(),
        'flash' => [
            'success' => fn () => $request->session()->get('success'),
            'error' => fn () => $request->session()->get('error'),
            'warning' => fn () => $request->session()->get('warning'),
            'information' => fn () => $request->session()->get('information'),
            'action_url' => fn () => $request->session()->get('action_url'),
        ],
        'notifications' => fn () => $request->user()
            ? $this->notificationService->getAllForUser($request->user()->id)
            : [],
    ];
}
```

Every prop here (`auth`, `hasProjects`, `emailEnabled`, `flash`,
`notifications`) reaches **every** page automatically, read via
`usePage<PageProps>().props` — this is how
[alerts](../alerts/README.md) and the [notifications bell popup](../notifications/03-frontend-backend-wiring-overview.md)
get their data without every page's controller repeating the same
prop. The closure form (`fn () => ...`) is Inertia's built-in "only
evaluate this if actually needed" laziness — cheap props like `auth`
are plain arrays, but anything requiring a query
(`hasAnyProjectsForUser`, `getAllForUser`) is wrapped so it doesn't run
on every single request regardless of whether the page uses it.
Add a new prop here only if genuinely every page needs it — a
page-specific prop belongs in that page's own controller action's
`Inertia::render(...)` call instead.

## Atomic design: what belongs where

- **Atoms** (`Components/Atoms/`) — the smallest reusable pieces:
  `Button`, `Badge`, `Input`, `Icon`, `BrandIcon`. Take primitive
  props (`string`, `boolean`, a `cva` variant key), never import a
  type from `resources/js/types/` for a domain model, never call a
  hook that reaches outside their own props (no `useAccent()`,
  no `router.post(...)`).
- **Molecules** (`Components/Molecules/`) — composed from Atoms into
  a small, still-fairly-generic unit: `Breadcrumb`, `NotificationItem`,
  `RoleBadge`. May take a domain-shaped prop (an `AlertItem`, a
  `WorkspaceRole`) but still don't reach into global state themselves
  — everything comes in as props from whatever Organism renders them.
- **Organisms** (`Components/Organisms/`) — feature-specific,
  composed from Molecules, and the first tier that's allowed to call
  context hooks directly (`useAlert()`, `useAccent()`) and make
  `router.post(...)` calls of its own — `IssuePageHeader`,
  `WorkspaceSettingsContent`, `NotificationsPopup` are all Organisms
  for exactly this reason.
- **Pages** (`Pages/`) — one per Inertia page name, receiving the
  controller's props directly and composing Organisms (plus the
  occasional Molecule) into the actual screen. A Page is the only tier
  that should destructure Inertia page props as its component
  signature.

The tell for "this is in the wrong tier": if an Atom needs a domain
type import or a context hook, it's actually a Molecule or Organism in
disguise — move it up rather than adding the import.

## Where the rest lives

- `context/` — one file per cross-cutting concern
  (`AlertContext`, `ThemeContext`, `AccentContext`, `ModalContext`,
  `ShortcutContext`), each exporting a `<X>Provider` and a `useX()`
  hook that throws if called outside its provider (see every existing
  context's `useX()` for this exact guard shape).
- `hooks/` — reusable stateful logic that isn't a whole context (a
  `useSavedFilters`, a resizable-column hook) — the line between "this
  needs a hook" and "this needs a context" is whether more than one
  unrelated part of the tree needs the *same* state, or just the same
  *shape* of logic independently.
- `types/` — one file per backend model/enum it mirrors
  (`Issues.ts`, `Projects.ts`, `Roles.ts`, …) — see any guide in
  `documentation/en/permissions/` or `notifications/` for the
  established convention of keeping a frontend type's shape in sync
  with its backend counterpart by hand (there's no codegen).
- `utils/` — pure functions with no React/Inertia dependency at all
  (`cn.ts`, `colors.ts`, `time.ts`, `accentColors.ts`) — if a "util"
  needs `useState` or context, it belongs in `hooks/` instead.

## Tests

This guide is reference material. For the testing conventions
themselves (colocated `*.test.tsx`, Vitest + Testing Library, jsdom),
see the root [`README.md`](../../../README.md#testing) and
`CLAUDE.md`.
