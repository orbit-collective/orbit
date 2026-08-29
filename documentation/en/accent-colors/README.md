# Accent colors

The accent color is the one brand color used for buttons, links,
selected states, and highlights across the whole interface — chosen
once per user (Account settings → Preferences → Accent color) and
applied everywhere via three CSS variables:
`--accent-color`/`--accent-light-color`/`--accent-color-opacity`. It's
independent of [dark/light theme](../theme-colors/README.md) (the same
accent applies in both, just with a slightly different opacity) and,
non-obviously, **shares its entire color-name vocabulary with a
project's badge color** — the ten names a user can pick as their
accent are exactly the ten colors available when creating a project,
reused on purpose ("the same palette available when creating a
project," per the Settings UI copy itself) but represented completely
differently under the hood for each use. This category documents that
whole system and the trap that comes with it.

## Guides, in the order you'd actually need them

1. **[Add a new accent color](./01-add-a-new-accent-color.md)** —
   worked example adding an 11th option, `teal`: every one of the four
   places a color name has to be added, in the right order, and why
   skipping any one of them produces a different kind of visible
   breakage.
2. **[Use the accent color in a component](./02-use-the-accent-color-in-a-component.md)**
   — the three variables, when to reach for which, and how this
   differs from a project's own fixed badge color even though both
   ultimately come from the same ten names.

## The architecture in one paragraph

`AccentColor` (`resources/js/types/Accent.ts`) is `'default' |
ProjectColors` — literally reusing `ProjectColors`
(`resources/js/types/Projects.ts`), the same ten-value union a
project's `color` field uses. `AccentProvider`
(`resources/js/context/AccentContext.tsx`) holds exactly one piece of
state, the chosen `AccentColor`, persisted to `localStorage`; on every
change (and every theme change, since the opacity differs per theme)
it computes CSS variable overrides via
`getAccentCssVariables()` (`resources/js/utils/accentColors.ts`) and
writes them as **inline styles on `<html>`**
(`root.style.setProperty('--accent-color', ...)`) — a different
mechanism from theme colors, which live entirely in a static CSS file
keyed by `[data-theme]`. Picking `'default'` removes the inline
overrides entirely, falling back to the plain `--accent-color` value
`global.css` already defines per theme (`#8844da` in both). Picking
any other name looks up a **separate hex-value map**,
`PROJECT_ACCENT_HEX`, keyed by the same ten names a *project's* badge
color renders from `getColorTheme()`
(`resources/js/utils/colors.ts`) — but that second map is built from
literal Tailwind utility classes (`bg-red-500`, …), not hex codes, so
the two features never actually share code, only the list of valid
names. There's a **third** independent copy of the hex map besides —
a plain-JS duplicate inline in `resources/views/app.blade.php`'s
pre-paint `<script>`, needed because that script runs before any JS
bundle (and therefore `accentColors.ts`) is even loaded. That's the
trap guide 1 walks through in full.
