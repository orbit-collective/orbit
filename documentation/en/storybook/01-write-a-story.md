# Write a story

Every component gets a colocated `<Name>.stories.tsx`.

## 1. Create the file

`resources/js/Components/Atoms/Button/Button.stories.tsx` is the
reference. The skeleton:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import Button from './Button';

const meta = {
    title: 'Atoms/Button',
    component: Button,
    args: { children: 'Save', onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Clicked: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button'));
        await expect(args.onClick).toHaveBeenCalledTimes(1);
    },
};
```

- `title` is `Atoms/…`, `Molecules/…` or `Organisms/…`; the sidebar order
  is set by `storySort` in `.storybook/preview.tsx`.
- Docs pages are generated for every file (`tags: ['autodocs']` in the preview).
- Use `fn()` for callbacks and assert on them in `play`.

## 2. Use shared data

```tsx
import { issues, makeProject } from '@/stories/fixtures';
```

`makeProject()` / `makeIssue()` take overrides. Add new shared fixtures
to `resources/js/stories/fixtures.ts`; one-off data stays in the story file.

## 3. Layout

Wrap in a decorator when the component needs a width:

```tsx
decorators: [
    (Story) => (
        <div className="w-[340px]">
            <Story />
        </div>
    ),
],
```

## 4. Check it

```bash
npx vitest run resources/js/stories
```

The story is picked up automatically by the per-layer test files (see
[Stories as Vitest tests](./04-stories-as-vitest-tests.md)). A story fails
if it throws, if its `play` function fails, or if React logs a
`console.error`.
