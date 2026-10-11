# Stories jako testy Vitest

Stories są testowane przez portable stories Storybooka: `composeStories` stosuje preview (dekoratory, providery, globale), a `story.run()` renderuje story i uruchamia jego funkcję `play` w jsdom.

## Gdzie to leży

- `resources/js/stories/runStories.ts` — `registerStories(modules)` tworzy jeden `describe` na plik story i jeden `it` na story. Story oblewa, jeśli rzuci wyjątek, jego `play` zawiedzie albo React wywoła `console.error`.
- `resources/js/stories/atoms.stories.test.tsx`, `molecules.stories.test.tsx`, `organisms.stories.test.tsx` — jeden plik na warstwę (żeby Vitest uruchamiał je równolegle). Każdy mockuje `@inertiajs/react` i `axios` oraz wczytuje `../Components/<Layer>/**/*.stories.tsx`.

Nowe pliki story są wykrywane przez glob; nie trzeba nic rejestrować.

## Komendy

```bash
npm run test:stories         # only the stories
npm test                     # everything, stories included
npm run test:coverage        # component tests with the coverage gate
```

## Pokrycie

`test:coverage` wyklucza `resources/js/stories/**`, więc renderowanie komponentu ze story nie wlicza się do progu 80/75: próg nadal mierzy własny, kolokowany test komponentu. Stories są dodatkową siatką regresji wizualnej i interakcji.

## CI

Job `Storybook` w `.github/workflows/ci.yml` uruchamia `npm run test:stories` i `npm run build-storybook` i jest zależnością `ci-status`.
