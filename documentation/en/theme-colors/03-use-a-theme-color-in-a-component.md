# Use a theme color in a component

The convention every component in this codebase follows, and the
mistakes that only show up in one of the two themes.

## The convention

Reference the CSS variable as a Tailwind **arbitrary value**, never a
hardcoded hex or a bare Tailwind palette color for anything that
should adapt to the theme:

```tsx
<div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-color)] p-4">
    <p className="text-[var(--text-color)]">Title</p>
    <p className="text-[var(--text-gray-color)]">Secondary text</p>
</div>
```

This works because Tailwind's arbitrary-value syntax
(`bg-[var(--x)]`) emits `background-color: var(--x)` literally — the
browser resolves `--x` at render time from whichever `[data-theme]`
block is active (see [guide 1](./01-how-theme-switching-works.md)), so
the component itself needs zero theme-awareness: no `useTheme()` call,
no conditional class, no re-render on theme change.

## The token vocabulary (what to reach for)

Every token in `global.css`, and what it's for — reach for the
existing one that matches your case rather than inventing a new one
(see [guide 2](./02-add-a-new-theme-color-token.md) for when a new
token is actually warranted):

| Token | Use for |
|---|---|
| `--bg-color` | Page/app background |
| `--bg-color-hover` | A hovered surface at the page-background level |
| `--bg-dark-color` | A recessed surface (sidebar, popup backdrop) |
| `--bg-light-color` / `--bg-light-color-hover` | A raised row/card surface and its hover state |
| `--text-color` | Primary text |
| `--text-gray-color` | Secondary text |
| `--text-muted-color` | Tertiary/placeholder text |
| `--border-color` / `--border-color-strong` | Default and emphasized borders |
| `--surface-color` | A card/panel background, subtler than `--bg-light-color` |
| `--overlay-color` | A modal/dropdown backdrop scrim |
| `--success-color` / `--error-color` / `--warning-color` / `--info-color` / `--pending-color` | Status/semantic colors (also what [alerts](../alerts/README.md) map their four types to) |
| `--accent-color` / `--accent-light-color` / `--accent-color-opacity` | The user's chosen brand accent — see [accent colors](../accent-colors/README.md), a separate system from the rest of this table |

## Mistakes that only break one theme

- **A hardcoded hex copied from a design mock.** `bg-[#101113]`
  matches `--bg-color-hover` in dark mode exactly, and is silently
  wrong (a near-black box on a light page) the moment someone
  switches to light. If you're tempted to hardcode a value you got
  from inspecting the dark theme, there's almost always an existing
  token for it — check the table above first.
- **A bare Tailwind palette class for anything meant to adapt**, e.g.
  `text-gray-400` instead of `text-[var(--text-gray-color)]` — it
  renders the same gray in both themes instead of the theme-tuned
  value, usually ending up too light to read on the light background
  or too dark to read on the dark one. Tailwind palette classes are
  still correct for something that's *supposed* to stay the same
  color regardless of theme — the fixed-hue swatches in
  `resources/js/utils/colors.ts` (project/label colors, e.g. a red
  project badge is the same red in both themes) are exactly that
  case; a project's own chosen color is part of its identity, not
  part of the interface chrome that theme tokens exist to control.
- **`prefers-color-scheme` media queries in component CSS.** That's
  the mechanism [emails use](./04-theme-colors-in-emails.md), which
  have no JavaScript and can't set `data-theme` — the app itself
  should never branch on the media query directly, only on
  `resolvedTheme` (and even that should be rare; almost everything
  should just be a CSS variable reference).

## Previewing both themes without touching your OS setting

Pick `dark`/`light` explicitly in Account settings → Preferences —
that's exactly what bypasses `system`'s OS-following behavior (see
[guide 1](./01-how-theme-switching-works.md)'s `resolveTheme()`) and
lets you see either theme regardless of your actual OS appearance
setting.

## Tests

No dedicated "uses the right token" test exists or is expected per
component — a component test verifying its rendered `className`
contains the expected `var(--...)` reference (as
`resources/js/Components/Molecules/Alert/Alert.test.tsx`'s
`'renders an icon styled for the %s intent'` does, asserting
`toHaveClass('text-[var(--success-color)]')` etc.) is the right level
of coverage; there's no broader lint rule catching a hardcoded hex
today.
