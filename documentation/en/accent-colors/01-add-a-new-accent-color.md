# Add a new accent color

Worked example: adding an 11th option, **teal**. Because `AccentColor`
is `'default' | ProjectColors` (see the
[README](./README.md)'s architecture section), this single new name
becomes both a new accent option *and* a new project badge color at
the same time — there's no way to add one without the other, since
they're the same union. Four separate, hand-maintained places need the
new name; miss one and you get a different specific kind of breakage,
not a build error.

## Step 1 — Add it to the shared color vocabulary

File: `resources/js/types/Projects.ts`

```ts
export type ProjectColors =
    | 'red'
    | 'orange'
    | 'yellow'
    | 'green'
    | 'lime'
    | 'blue'
    | 'sky'
    | 'violet'
    | 'purple'
    | 'pink'
    | 'teal';

export const AVAILABLE_COLORS: ProjectColors[] = [
    'red',
    'orange',
    'yellow',
    'green',
    'lime',
    'blue',
    'sky',
    'violet',
    'purple',
    'pink',
    'teal',
];
```

This alone makes `teal` a valid project badge color end to end —
every project color picker (`NewProjectModal`, `ProjectDetailsForm`,
`ProjectOnboardingForm`, and others) reads from `AVAILABLE_COLORS`
generically, no per-component change needed. It does **not** yet make
`teal` render correctly (step 2) or make it selectable as an accent
(steps 3–4) — each of those needs its own update below.

The name must be a **real Tailwind color name** (`teal`, not something
invented) — step 2's classes are literal strings Tailwind's build
scans for; a made-up name has no `bg-‹name›-500` utility to generate
at all.

## Step 2 — Give it a project-badge Tailwind theme

File: `resources/js/utils/colors.ts`

```ts
teal: {
    badgeBg: 'bg-teal-500/10 text-teal-400',
    border: 'hover:border-teal-500/30 shadow-teal-500/5',
    gradient: 'from-teal-500/5 to-transparent',
    accent: 'bg-teal-500',
    textGroupHover: 'group-hover:text-teal-500',
},
```

These must be **written out literally**, not built from a template —
Tailwind's scanner only generates a utility class if the exact string
appears somewhere in the scanned source (`tailwind.config.js`'s
`content` globs include `resources/js/**/*.{ts,tsx}`); a
`` `bg-${color}-500` `` template expression is invisible to that scan
and would silently produce no CSS at all, no matter how correct the
runtime string ends up being. Copy the five-property shape from an
existing color exactly, swapping only the color name.

## Step 3 — Make it a valid accent value

File: `resources/js/context/AccentContext.tsx`

```ts
const isAccentColor = (value: string | null): value is AccentColor => {
    return (
        value === 'default' ||
        value === 'red' ||
        value === 'orange' ||
        value === 'yellow' ||
        value === 'green' ||
        value === 'lime' ||
        value === 'blue' ||
        value === 'sky' ||
        value === 'violet' ||
        value === 'purple' ||
        value === 'pink' ||
        value === 'teal'
    );
};
```

Without this, a `teal` value read back from `localStorage` on a future
visit fails the guard and silently resets to `'default'` — the
picker (step 4) would still let someone select it once, but the
choice wouldn't survive a page reload.

## Step 4 — Give it accent hex values and a picker label

File: `resources/js/utils/accentColors.ts`

```ts
export const ACCENT_COLOR_OPTIONS: AccentColor[] = [
    'default',
    'red',
    'orange',
    'yellow',
    'green',
    'lime',
    'blue',
    'sky',
    'violet',
    'purple',
    'pink',
    'teal',
];

const PROJECT_ACCENT_HEX: Record<
    ProjectColors,
    { base: string; light: string }
> = {
    red: { base: '#ef4444', light: '#f87171' },
    orange: { base: '#f97316', light: '#fb923c' },
    yellow: { base: '#eab308', light: '#facc15' },
    green: { base: '#22c55e', light: '#4ade80' },
    lime: { base: '#84cc16', light: '#a3e635' },
    blue: { base: '#3b82f6', light: '#60a5fa' },
    sky: { base: '#0ea5e9', light: '#38bdf8' },
    violet: { base: '#8b5cf6', light: '#a78bfa' },
    purple: { base: '#a855f7', light: '#c084fc' },
    pink: { base: '#ec4899', light: '#f472b6' },
    teal: { base: '#14b8a6', light: '#2dd4bf' },
};
```

`base`/`light` here are **hex codes**, not Tailwind class names — this
is the map step 2 does *not* share, even though both are keyed by the
same `teal` name (see the README's architecture note). Use the
official Tailwind palette's `-500`/`-400` hex values for the color
(here, `teal-500`/`teal-400`) so the accent swatch and the project
badge read as "the same teal," even though nothing enforces that
match in code.

File:
`resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsPreferencesTab.tsx`

```ts
const accentLabels: Record<AccentColor, string> = {
    default: 'Default',
    red: 'Red',
    orange: 'Orange',
    yellow: 'Yellow',
    green: 'Green',
    lime: 'Lime',
    blue: 'Blue',
    sky: 'Sky',
    violet: 'Violet',
    purple: 'Purple',
    pink: 'Pink',
    teal: 'Teal',
};
```

This is a third, independent hand-maintained record keyed by the same
names — `Record<AccentColor, string>` means TypeScript itself will
refuse to compile once step 3/4 widen `AccentColor` until this map
also gets the new key, which is the one piece of this whole chain
that *does* have a compiler safety net.

## Tests

- `resources/js/utils/colors.test.ts` — its
  `test.each(AVAILABLE_COLORS)('returns a complete, color-matched
  theme for "%s"', ...)` already iterates the array generically; once
  step 1 adds `'teal'` and step 2 adds its entry, this test covers it
  with zero changes, *as long as* step 2's classes follow the exact
  `` bg-${color}-500 `` naming pattern the test asserts against.
- `resources/js/utils/accentColors.ts` has no dedicated test file
  today — add
  `resources/js/utils/accentColors.test.ts` covering `getAccentSwatch('teal')`
  (returns the `base` hex) and `getAccentCssVariables('teal', 'dark')`
  /`getAccentCssVariables('teal', 'light')` (returns the right
  `accentColor`/`accentLightColor`, and an `accentColorOpacity` alpha
  of `0.2` for dark vs. `0.12` for light), mirroring
  `resources/js/context/AccentContext.test.tsx`'s existing assertions
  on `getAccentCssVariables`'s shape for the colors it already
  exercises.
- `resources/js/context/AccentContext.test.tsx` — no change required;
  its `'setAccentColor updates state, persists to localStorage, and
  sets the CSS variables'` test uses a fixed existing color as its
  fixture and isn't parameterized over every `AccentColor`, so a new
  name doesn't need a new case here unless you want one for extra
  confidence.
