# Scope and non-goals

Things that look like they might be missing, half-built, or worth
"fixing" at a glance, but are actually deliberate — read this before
assuming something is a bug or an oversight.

## No REST/JSON API

Orbit has no versioned, documented API for third-party consumption,
and isn't building toward one — every route either renders an Inertia
page or handles a mutation and redirects back. `NotificationController::index()`
does return raw JSON (`GET /notifications`), but it's dead code from
the frontend's perspective — the notification bell popup reads from
the shared Inertia prop instead (see
[`../notifications/03-frontend-backend-wiring-overview.md`](../notifications/03-frontend-backend-wiring-overview.md)).
Don't take an existing JSON-returning endpoint as precedent for a new
API surface.

## `laravel/sanctum` is a dependency, not a feature

It's in `composer.json` and nowhere else — no `Sanctum::` config, no
`auth:sanctum` middleware, no personal access tokens anywhere in the
codebase. Authentication is plain Laravel session auth
(`AuthenticatedSessionController`, `RegisteredUserController`,
`auth` middleware) with a per-user configurable `session_lifetime`
column. If a real token-based API ever becomes a goal, Sanctum is
already pulled in for it — but until then, treat it as unused, not as
a half-implemented feature to finish.

## No global "admin" role

There is no `role` column on `users` and no concept of a site-wide
administrator anywhere in the app. Every permission is scoped to a
project — see
[`../permissions/README.md`](../permissions/README.md). The same
person can be Owner of one project and a plain Member (or not a
member at all) of another; there's no user who can act on every
project in the system.

## Most Workspace settings tabs are placeholders

`resources/js/types/Settings.ts`'s `SETTINGS_TABS` lists Labels,
Statuses, Priorities, Templates, and Documents (Workspace section) and
Export (Account section) with `enabled: false` — they render in the
sidebar nav for discoverability, but the tab itself is unreachable
(see [`../settings-tabs/README.md`](../settings-tabs/README.md)'s
architecture section for exactly how `enabled: false` is enforced).
`AccountSettingsExportTab.tsx` already exists as a component and even
renders if you reach it programmatically — it's just never reachable
through normal navigation, since the enabled-tab gate lives in
`Pages/Settings/Index.tsx`, one level above where that component is
rendered.

## 20 of 21 catalog integrations are "coming soon"

Only Discord is wired up on the backend
(`ProjectIntegrationService::AVAILABLE_INTEGRATIONS`) — every other
entry in `resources/js/types/Integrations.ts`'s catalog exists purely
as frontend display data (name, icon, category, description) with
`comingSoon: true`, and the backend has no matching
`IntegrationNotifier` for any of them. See
[`../integrations/01-add-a-new-integration.md`](../integrations/01-add-a-new-integration.md)
for turning one into a real integration.

## Issue mentions are defined but not implemented

`NotificationType::IssueMentioned` exists as an enum case, and
Account settings → Notifications already has a toggle for it — but
nothing in the codebase ever fires it. There's no `@mention` parsing
anywhere in the comment-creation path. Don't assume a
`NotificationType` case having a settings row means the feature
behind it is live; check for an actual `notify()` call site (see
[`../notifications/01-add-a-new-notification-type.md`](../notifications/01-add-a-new-notification-type.md)) too.

## No dedup or cap on the toast/alert stack

Covered in depth in
[`../alerts/04-customize-alert-behavior.md`](../alerts/04-customize-alert-behavior.md)
— firing the same alert repeatedly, or many alerts in quick
succession, stacks them all with no limit today. Not a bug so much as
"nothing has needed it yet."

## Tests

Non-goals aren't behavior to test — this guide exists so you don't go
looking for tests covering a feature that was never built.
