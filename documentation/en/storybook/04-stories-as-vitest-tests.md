# Stories as Vitest tests

Stories are tested through Storybook's portable stories: `composeStories`
applies the preview (decorators, providers, globals) and `story.run()`
renders the story and runs its `play` function in jsdom.

## Where it lives

- `resources/js/stories/runStories.ts` — `registerStories(modules)` creates
  one `describe` per story file and one `it` per story. A story fails if it
  throws, its `play` fails, or React calls `console.error`.
- `resources/js/stories/atoms.stories.test.tsx`, `molecules.stories.test.tsx`,
  `organisms.stories.test.tsx` — one file per layer (so Vitest runs them in
  parallel). Each mocks `@inertiajs/react` and `axios` and globs
  `../Components/<Layer>/**/*.stories.tsx`.

New story files are picked up by the glob; nothing to register.

## Commands

```bash
npm run test:stories         # only the stories
npm test                     # everything, stories included
npm run test:coverage        # component tests with the coverage gate
```

## Coverage

`test:coverage` excludes `resources/js/stories/**`, so rendering a
component from its story does not count toward the 80/75 gate: the gate
keeps measuring the component's own colocated test. Stories are the
visual and interaction regression net on top.

## CI

The `Storybook` job in `.github/workflows/ci.yml` runs `npm run
test:stories` and `npm run build-storybook`, and is a dependency of
`ci-status`.
