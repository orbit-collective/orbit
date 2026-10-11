# Storybook

Storybook to warsztat komponentów Orbit: każdy komponent z `resources/js/Components` jest pokazany w izolacji, pogrupowany według warstw atomic design (Atoms, Molecules, Organisms), z paskiem narzędzi do przełączania motywu (ciemny/jasny) i koloru akcentu. Stories są jednocześnie testami Vitest.

## Przewodniki, w kolejności, w jakiej faktycznie będą potrzebne

1. **[Napisz story](./01-write-a-story.md)** — dodaj `X.stories.tsx` obok komponentu, z wariantami i interakcją.
2. **[Mockowanie Inertia, tras i sieci](./02-mock-inertia-and-network.md)** — daj story propsy strony, błędy formularza i odpowiedzi API bez backendu.
3. **[Motyw, akcent i kontener Dockera](./03-theme-accent-and-docker.md)** — jak działa pasek narzędzi i jak uruchomić Storybook (`make storybook`).
4. **[Stories jako testy Vitest](./04-stories-as-vitest-tests.md)** — jak każde story jest renderowane i sprawdzane przez `npm run test:stories` oraz jak jest trzymane poza progiem pokrycia.

## Architektura w jednym akapicie

Konfiguracja leży w `.storybook/`: `main.ts` (wzorce plików stories, addony), `vite.config.ts` (osobna konfiguracja Vite, która podmienia `@inertiajs/react` i `axios` na mocki z `.storybook/mocks/`), `preview.tsx` (globalny CSS, przełączniki, dekorator `withOrbitApp`) oraz `docs.tsx` (kontener dokumentacji zależny od motywu). Dekorator owija każde story w prawdziwe providery aplikacji (motyw, akcent, alerty, modale, skróty, komendy), więc komponenty zachowują się jak w aplikacji. Wspólne dane przykładowe to `resources/js/stories/fixtures.ts`, typowane względem własnych typów aplikacji.
