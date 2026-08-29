# Architecture & project technicals

Every other category in `documentation/` is a step-by-step "how do I
extend X" guide for one specific subsystem. This category is
different in kind: it's the map of the whole project — stack,
request/response lifecycle, layering rules, local dev environment, and
what's deliberately *not* built yet — read this first if you're new to
the codebase, before any other category.

Much of this content already exists at the repo root — the top-level
[`README.md`](../../../README.md) is a genuinely thorough onboarding
document (stack table, full Docker/Doppler walkthrough, deployment
steps, a project structure map, a conventions list) and `CLAUDE.md` is
the condensed reference Claude Code itself loads every session. This
category doesn't replace either — it goes one level deeper on specific
mechanics those two deliberately keep brief (the exact request
lifecycle, per-service Docker Compose wiring, the full dependency
list and what each one is for, explicit non-goals), and cross-links
back to both rather than repeating them.

## Guides, in the order you'd actually want them

1. **[Tech stack and project structure](./01-tech-stack-and-project-structure.md)**
   — every real dependency (not just the headline ones) and what it's
   actually for, plus a deeper pass over the directory map than the
   root README's summary table.
2. **[Backend layered architecture](./02-backend-layered-architecture.md)**
   — Controller → Service → Repository, traced through one real
   request end to end, and the checklist for adding a brand-new domain
   that follows the same shape.
3. **[Frontend architecture and atomic design](./03-frontend-architecture-and-atomic-design.md)**
   — Inertia's page-resolution mechanism, the provider stack every
   page mounts under, atomic design's three tiers with the actual rule
   for what belongs where, and the shared-prop/local-state split.
4. **[Docker, Doppler, and deployment](./04-docker-doppler-and-deployment.md)**
   — what each Compose service actually does, the two-stage
   `Dockerfile`, exactly how Doppler-linked vs. fallback `.env` mode is
   detected, and the production deployment checklist.
5. **[Scope and non-goals](./05-scope-and-non-goals.md)** — what Orbit
   deliberately doesn't do yet (a real REST API, a global admin role,
   most of the Workspace settings tabs, `laravel/sanctum` despite being
   a dependency) and why, so you don't go looking for something that
   isn't there or accidentally reverse a deliberate decision.

## The architecture in one paragraph

Orbit is one Laravel + Inertia.js + React codebase with no separate
API layer — every page is server-rendered as an Inertia response
carrying real Eloquent-model-shaped props, and the same models never
get a second, hand-maintained JSON API representation the way a
decoupled SPA would need. The backend is a strict three-layer stack
(Controller → Service → Repository — see guide 2); the frontend is
atomic design (Atoms → Molecules → Organisms → Pages — see guide 3)
wrapped in a fixed provider stack (`ThemeProvider` →
`AccentProvider` → `ModalProvider` → `AlertProvider` →
`ShortcutProvider`) that every page mounts under identically. Local
development runs either natively (PHP + Node directly) or in Docker,
with an optional [Doppler](https://www.doppler.com/) link supplying
secrets to the Docker Compose process in place of a plain `.env` file
— see guide 4 for exactly how that detection works.
