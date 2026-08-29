# How theme switching works

Read this before touching anything in this category — the other
guides assume you know how `theme`, `resolvedTheme`, and `data-theme`
relate.

## The three `ThemeMode` values vs. the two real themes

File: `resources/js/types/Theme.ts`

```ts
export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';
```

`ThemeMode` is what the user picked (in Account settings → Preferences
→ Interface theme, `AccountSettingsPreferencesTab.tsx`'s `themeOptions`
array feeding `AccountSettingsThemeCard`). `ResolvedTheme` is what
actually gets applied — there are only ever two real themes; `system`
is never applied directly, it's resolved to one of the other two.

## `ThemeProvider`, step by step

File: `resources/js/context/ThemeContext.tsx`

```ts
const resolveTheme = (theme: ThemeMode): ResolvedTheme => {
    if (theme === 'system') {
        return typeof window !== 'undefined' &&
            window.matchMedia(LIGHT_MEDIA_QUERY).matches
            ? 'light'
            : 'dark';
    }

    return theme;
};
```

(`LIGHT_MEDIA_QUERY` is `'(prefers-color-scheme: light)'` — note the
OS default is treated as **dark**: if the media query doesn't match
— including in a test/SSR environment with no `matchMedia` — `system`
resolves to `'dark'`, not `'light'`.)

On mount, `theme` is read from `localStorage` (`THEME_STORAGE_KEY =
'theme'`), defaulting to `'dark'` if nothing is stored or the stored
value isn't a valid `ThemeMode` (`isThemeMode()` guards this). Three
effects do the actual work:

1. Whenever `theme` changes, recompute `resolvedTheme` via
   `resolveTheme(theme)`.
2. Only while `theme === 'system'`: subscribe to the media query's
   `change` event and re-resolve live — this is what makes switching
   your OS's appearance update Orbit immediately, with no reload,
   for exactly the users who picked "System sync." Anyone who picked
   `dark`/`light` explicitly is unaffected by OS changes.
3. Whenever `resolvedTheme` changes:
   `document.documentElement.setAttribute('data-theme', resolvedTheme)`
   — this single line is the entire bridge between React state and
   the CSS in `global.css`. Nothing else in the app ever sets
   `data-theme`.

`setTheme(next)` updates the state and mirrors it to `localStorage` in
the same call — there's no separate "save" step, every pick is
persisted immediately.

## What actually changes when the theme flips

Only the `data-theme` attribute on `<html>`. Every component's colors
update instantly and automatically because they reference CSS
variables, not because any component re-renders for the theme change
— `ThemeContext`'s consumers are `ThemeProvider` itself (for the
`data-theme` effect) and whatever renders the theme picker UI
(`useTheme()`'s `theme`/`setTheme` for the selected-state radio
buttons). A component that only uses `var(--text-color)` etc. in its
Tailwind classes needs zero theme-awareness of its own — see
[guide 3](./03-use-a-theme-color-in-a-component.md).

## Tests

- `resources/js/context/ThemeContext.test.tsx` — already covers
  `system` resolution against a mocked `matchMedia`, the `localStorage`
  round-trip, and the `data-theme` attribute effect. No changes needed
  unless you add a new `ThemeMode` (not covered by any guide here,
  since there is no real third theme today — `system` is a resolution
  strategy, not a palette).
