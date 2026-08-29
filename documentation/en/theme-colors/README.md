# Theme colors (dark / light)

Every color a component uses — background, text, border, status colors
— is a CSS custom property (`--bg-color`, `--text-color`, `--error-color`,
…), never a hardcoded hex value. A user picks `dark`, `light`, or
`system` in Account settings; that choice resolves to one of two
complete variable sets defined in `resources/css/global.css`, keyed by
a `data-theme` attribute on `<html>`. This category documents that
system end to end: how the switch actually works, how to add a new
themed color safely (in both variants, or a component silently keeps
the dark value in light mode), how to consume one correctly, and the
completely separate mechanism transactional emails use (no JS, no
`localStorage` — pure `prefers-color-scheme` CSS).

This is a different system from [accent colors](../accent-colors/README.md) —
the one user-customizable brand color used for buttons/links/highlights,
independent of dark/light. See that category for anything about
`--accent-color`/`--accent-light-color`/`--accent-color-opacity`
specifically.

## Guides, in the order you'd actually need them

1. **[How theme switching works](./01-how-theme-switching-works.md)**
   — `ThemeContext`'s three modes (`dark`/`light`/`system`), how
   `system` resolves and stays in sync with the OS, persistence, and
   exactly what flips when the theme changes.
2. **[Add a new theme color token](./02-add-a-new-theme-color-token.md)**
   — worked example adding `--danger-strong-color`: both variants,
   the light/dark parity rule, and where the value actually needs to
   look different between the two.
3. **[Use a theme color in a component](./03-use-a-theme-color-in-a-component.md)**
   — the Tailwind arbitrary-value convention every component follows,
   the mistakes that silently break in only one theme, and how to
   preview both without switching your OS setting.
4. **[Theme colors in emails](./04-theme-colors-in-emails.md)**
   — the separate, JS-free mechanism transactional emails use
   (`prefers-color-scheme` media queries baked into
   `emails/layout.blade.php`), and how to add a new themed value there.

## The architecture in one paragraph

`resources/css/global.css` defines every color variable twice: once
under `:root, [data-theme='dark']` (also the default — an unthemed
page is dark) and once under `[data-theme='light']`. `ThemeProvider`
(`resources/js/context/ThemeContext.tsx`) owns exactly one piece of
real state, `theme: 'dark' | 'light' | 'system'`, persisted to
`localStorage`; it derives `resolvedTheme: 'dark' | 'light'` from that
(resolving `'system'` via `matchMedia('(prefers-color-scheme: light)')`,
re-resolving live if the OS setting changes while `system` is active)
and writes `resolvedTheme` onto `<html data-theme="...">` in an effect
— that single attribute is what makes the CSS block above apply. No
component ever reads `resolvedTheme` to pick a color itself; every
component just references the CSS variable (`var(--text-color)`, as a
Tailwind arbitrary value: `text-[var(--text-color)]`) and the browser
resolves it from whichever `[data-theme]` block is active. The one
place that reads `resolvedTheme` directly for non-CSS-variable logic is
[accent colors](../accent-colors/README.md) — the accent's highlight
opacity differs slightly between the two themes.
