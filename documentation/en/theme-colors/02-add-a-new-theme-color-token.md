# Add a new theme color token

Worked example: adding `--danger-strong-color` — a more saturated
red than `--error-color`, for a "this is destructive and immediate"
emphasis (e.g. a delete-confirmation button's hover state) that reads
correctly in both themes rather than just reusing `--error-color` at a
different opacity.

## The one rule that matters most here

**Every token needs a value in both `[data-theme='dark']` and
`[data-theme='light']` blocks in the same commit.** There's no
fallback: a token defined in only one block resolves to nothing
(`var(--danger-strong-color)` with no matching custom property is
simply invalid, and CSS treats the property as unset) whenever the
*other* theme is active — not "looks slightly off," entirely blank/
transparent. The two blocks are two independent, hand-maintained
lists; nothing generates one from the other, and nothing warns you at
build time if you forget one.

## Step 1 — Add the token to both theme blocks

File: `resources/css/global.css`

```css
:root,
[data-theme='dark'] {
    --accent-color: #8844da;
    --accent-light-color: rgb(183 103 255 / 0.8);
    --accent-color-opacity: rgba(136, 68, 218, 0.2);
    --success-color: #4caf50;
    --error-color: #f44336;
    --danger-strong-color: #ff1744;
    --warning-color: #ff9800;
    --pending-color: #757575;
    --info-color: #2196f3;
    --bg-color: #08090a;
    --bg-color-hover: #101113;
    --bg-dark-color: #050505;
    --bg-light-color: rgb(255 255 255 / 0.08);
    --bg-light-color-hover: rgb(255 255 255 / 0.12);
    --text-color: #f7f7f8;
    --text-gray-color: #8a8f98;
    --text-muted-color: #71717a;
    --border-color: rgb(255 255 255 / 0.08);
    --border-color-strong: rgb(255 255 255 / 0.14);
    --surface-color: rgb(255 255 255 / 0.03);
    --overlay-color: rgba(0, 0, 0, 0.2);
}

[data-theme='light'] {
    --accent-color: #8844da;
    --accent-light-color: rgb(183 103 255 / 0.8);
    --accent-color-opacity: rgba(136, 68, 218, 0.12);
    --success-color: #2e7d32;
    --error-color: #d32f2f;
    --danger-strong-color: #c62828;
    --warning-color: #b26a00;
    --pending-color: #6b7280;
    --info-color: #1565c0;
    --bg-color: #f7f8fa;
    --bg-color-hover: #ffffff;
    --bg-dark-color: #eef0f4;
    --bg-light-color: rgb(0 0 0 / 0.045);
    --bg-light-color-hover: rgb(0 0 0 / 0.07);
    --text-color: #14161a;
    --text-gray-color: #5b6472;
    --text-muted-color: #8a8f98;
    --border-color: rgb(0 0 0 / 0.08);
    --border-color-strong: rgb(0 0 0 / 0.14);
    --surface-color: rgb(0 0 0 / 0.03);
    --overlay-color: rgba(0, 0, 0, 0.06);
}
```

Note the dark value (`#ff1744`, a bright saturated red that pops
against a near-black background) and the light value (`#c62828`, a
darker/more muted red — the same bright red would be too low-contrast
against a light background and would clash rather than emphasize).
This is true of every existing pair — compare `--success-color`
(`#4caf50` dark vs. `#2e7d32` light) or `--error-color` (`#f44336` vs.
`#d32f2f`): the light variant is consistently a darker/deeper shade of
the same hue, not the identical hex reused. Pick your two values with
that same relationship, not a single color copy-pasted into both
blocks — a copy-pasted value is the single most common way a token
"technically satisfies" the rule above while still looking wrong in
one theme.

## Step 2 — Use it

No registration step exists — a CSS custom property is available the
moment it's declared. Reference it exactly like any existing token
(see [guide 3](./03-use-a-theme-color-in-a-component.md) for the full
convention):

```tsx
<button className="bg-[var(--danger-strong-color)] text-white hover:opacity-90">
    Delete permanently
</button>
```

## Tests

There's no dedicated test file for `global.css` tokens themselves (CSS
custom properties aren't something Vitest/jsdom meaningfully
evaluates) — coverage comes from whatever component test already
exists for the component you added the token to (a snapshot or a
`toHaveClass('bg-[var(--danger-strong-color)]')` assertion is enough;
don't write a test whose only job is "the CSS variable exists").
