# Use the accent color in a component

## The three variables

| Variable | Typical use |
|---|---|
| `--accent-color` | Solid accent surfaces/text: a primary button's background, a link, a selected tab's underline, a focused input's border |
| `--accent-light-color` | A lighter accent for things layered on top of an already-accented surface, or a subtler highlight |
| `--accent-color-opacity` | A translucent accent wash — a selected list row's background, a selected card's tint (see `AccountSettingsThemeCard.tsx`'s `selected` state: `border-[var(--accent-color)] bg-[var(--accent-color-opacity)]`) |

Reference them exactly like any [theme color](../theme-colors/03-use-a-theme-color-in-a-component.md)
— a Tailwind arbitrary value, never copied out as a hardcoded hex:

```tsx
<button className="rounded-lg bg-[var(--accent-color)] px-4 py-2 text-white hover:opacity-90">
    Save changes
</button>
```

This needs zero `useAccent()`/`useTheme()` awareness in the component
itself — same reasoning as theme colors: `AccentProvider` writes the
three variables as inline styles on `<html>` (see the
[README](./README.md)), and the browser resolves them at render time
regardless of which component is asking.

## When you *do* need `useAccent()` directly

Only when a component needs the **current color's identity**, not
just its rendered value — the accent picker itself is the main case:

```tsx
import { useAccent } from '@/context/AccentContext';
import { ACCENT_COLOR_OPTIONS, getAccentSwatch } from '@/utils/accentColors';

const { accentColor, setAccentColor } = useAccent();

return (
    <div className="flex flex-wrap gap-3">
        {ACCENT_COLOR_OPTIONS.map((color) => (
            <button
                key={color}
                type="button"
                onClick={() => setAccentColor(color)}
                className={`h-8 w-8 rounded-full border-2 ${
                    accentColor === color
                        ? 'scale-110 border-[var(--text-color)]'
                        : 'border-transparent'
                }`}
                style={{ backgroundColor: getAccentSwatch(color) }}
            />
        ))}
    </div>
);
```

`getAccentSwatch()` returns a **hex string** for inline `style=`, not
a CSS variable — deliberately, since this swatch needs to show every
option's real color simultaneously (including options that aren't the
active accent, which have no CSS variable to read from). Compare this
to `AccountSettingsThemeCard.tsx`'s theme previews, which use literal
hex values for the same reason (see that component's own doc comment)
— both pickers need to render every choice's true appearance at once,
which `var(--accent-color)` alone can't do since it only ever holds
the *currently active* one.

## Accent color vs. a project's badge color

Both ultimately come from the same ten names (`ProjectColors` — see
the [README](./README.md)), but they are not interchangeable and pull
from different code:

- **A project's badge/card color** (`project.color`, rendered via
  `getColorTheme()` in `resources/js/utils/colors.ts`) is fixed data
  about that project, stored per-project, rendered with literal
  Tailwind classes (`bg-red-500/10`, …) that look identical regardless
  of the viewer's theme or their own accent preference. Use this for
  anything that's inherently "this project's color" — a project card,
  a project badge in a list.
- **The accent color** (`--accent-color` and friends) is a
  per-*viewer* preference applied to generic interactive chrome —
  buttons, links, selected states — completely unrelated to which
  project (if any) is on screen. Use this for anything that should
  match whatever brand color the current user picked, not any
  particular project's identity.

Reaching for the wrong one is the most common mistake: a project badge
built from `var(--accent-color)` would make every project look like
whatever color the *viewer* happens to prefer, not the color the
project was actually given; conversely, a generic "Save" button built
from a hardcoded `bg-purple-500` ignores the user's accent choice
entirely.

## Tests

Same guidance as
[theme colors](../theme-colors/03-use-a-theme-color-in-a-component.md#tests) —
assert on the rendered `className`/inline `style` containing the
expected `var(--accent-...)` reference or hex value, at the level of
whatever component you're adding. No dedicated "accent variables
exist" test is expected beyond that.
