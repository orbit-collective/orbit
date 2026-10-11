# Napisz story

Każdy komponent dostaje obok siebie plik `<Name>.stories.tsx`.

## 1. Utwórz plik

Wzorcem jest `resources/js/Components/Atoms/Button/Button.stories.tsx`. Szkielet:

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

- `title` to `Atoms/…`, `Molecules/…` lub `Organisms/…`; kolejność w panelu bocznym ustawia `storySort` w `.storybook/preview.tsx`.
- Strony dokumentacji są generowane dla każdego pliku (`tags: ['autodocs']` w preview).
- Używaj `fn()` dla callbacków i sprawdzaj je w `play`.

## 2. Użyj wspólnych danych

```tsx
import { issues, makeProject } from '@/stories/fixtures';
```

`makeProject()` / `makeIssue()` przyjmują nadpisania. Nowe wspólne fixtures dodawaj do `resources/js/stories/fixtures.ts`; dane jednorazowe zostają w pliku story.

## 3. Układ

Opakuj w dekorator, gdy komponent potrzebuje szerokości:

```tsx
decorators: [
    (Story) => (
        <div className="w-[340px]">
            <Story />
        </div>
    ),
],
```

## 4. Sprawdź

```bash
npx vitest run resources/js/stories
```

Story jest wykrywane automatycznie przez pliki testów poszczególnych warstw (zobacz [Stories jako testy Vitest](./04-stories-as-vitest-tests.md)). Story oblewa, jeśli rzuci wyjątek, jeśli jego funkcja `play` zawiedzie albo jeśli React zaloguje `console.error`.
