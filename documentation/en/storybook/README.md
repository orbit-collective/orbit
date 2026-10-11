# Storybook

Storybook is Orbit's component workshop: every component under
`resources/js/Components` is shown in isolation, grouped by atomic-design
layer (Atoms, Molecules, Organisms), with a toolbar to flip the theme
(dark/light) and the accent color. Stories double as Vitest tests.

## Guides, in the order you'd actually need them

1. **[Write a story](./01-write-a-story.md)** — add `X.stories.tsx` next
   to a component, with variants and an interaction.
2. **[Mock Inertia, routes and the network](./02-mock-inertia-and-network.md)**
   — give a story page props, form errors and API responses without a
   backend.
3. **[Theme, accent and the Docker container](./03-theme-accent-and-docker.md)**
   — how the toolbar works and how to run Storybook (`make storybook`).
4. **[Stories as Vitest tests](./04-stories-as-vitest-tests.md)** — how
   every story is rendered and checked by `npm run test:stories`, and how
   it is kept out of the coverage gate.

## The architecture in one paragraph

Config lives in `.storybook/`: `main.ts` (story globs, addons),
`vite.config.ts` (a dedicated Vite config that aliases `@inertiajs/react`
and `axios` to the mocks in `.storybook/mocks/`), `preview.tsx` (global
CSS, toolbar globals, the `withOrbitApp` decorator) and `docs.tsx` (a
theme-aware docs container). The decorator wraps each story in the app's
real providers (theme, accent, alerts, modals, shortcuts, commands) so
components behave as in the app. Shared sample data is
`resources/js/stories/fixtures.ts`, typed against the app's own types.
