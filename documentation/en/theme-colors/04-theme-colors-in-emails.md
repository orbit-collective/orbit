# Theme colors in emails

Transactional emails (`resources/views/emails/*.blade.php`) render in
a recipient's mail client, not in Orbit's own browser tab — there's no
`localStorage`, no `ThemeProvider`, no `data-theme` attribute to read.
They still adapt to dark/light, but through a completely independent
mechanism: a `prefers-color-scheme` CSS media query baked directly
into the layout, evaluated by the mail client itself.

## How it works

File: `resources/views/emails/layout.blade.php`

The layout is written **dark-first** — every inline `style=""`
attribute on every element is the dark value, since that's the
guaranteed-safe default:

```html
<body class="email-bg" style="margin:0; padding:0; background-color:#08090a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
```

A `<style>` block in `<head>` then overrides specific classes — not
inline styles, which nothing in a `<style>` block can beat via
selector specificity alone, hence why every overridable surface also
carries a matching class:

```html
@media (prefers-color-scheme: light) {
    .email-bg { background-color: #f7f8fa !important; }
    .email-container { background-color: #ffffff !important; border-color: rgba(0, 0, 0, 0.08) !important; }
    .email-text { color: #14161a !important; }
    .email-muted { color: #5b6472 !important; }
    .email-footer-muted { color: #8a8f98 !important; }
    .email-border-top { border-top-color: rgba(0, 0, 0, 0.08) !important; }
}
```

Both the inline dark style *and* the matching class must be present
on the same element for this to work — the class is inert without the
media query matching, and the inline style is the fallback for every
client that ignores the media query entirely (see below).

## The one rule that matters most here

**Outlook desktop ignores `<style>` and `prefers-color-scheme`
entirely, so every recipient using it sees the dark, inline-style
version regardless of their system setting** — this is called out
directly in `layout.blade.php`'s own comment above the `<style>`
block, and is *why* the layout is dark-first rather than light-first:
the inline styles are the only thing every client is guaranteed to
render, so they need to be the intended default look, not a fallback
nobody's supposed to see. Clients that do support the media query
(Gmail, Apple Mail, Outlook.com, Yahoo) get the light override
layered on top when the recipient's system is set to light.

## Adding a new themed element

There's no enum of "email theme tokens" to extend the way
`global.css` has one for the app — you add a class + inline style pair
directly. Worked example: a callout box that needs to flip between a
dark surface and a light surface, following the exact same shape as
`.email-container`:

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-container" style="background-color:#16171a; border:1px solid rgba(255,255,255,0.08); border-radius:8px;">
    <tr>
        <td class="email-text" style="padding:16px; color:#f7f7f8; font-size:14px;">
            Heads up: this invitation expires in 7 days.
        </td>
    </tr>
</table>
```

reusing the **existing** `.email-container`/`.email-text` classes
(already overridden by the media query above) is almost always
correct — only add a **new** class + a new rule inside the
`@media (prefers-color-scheme: light)` block if the element's dark/
light colors genuinely don't match any existing pair, following the
exact `.email-x { property: value !important; }` shape (the
`!important` is required — it's what lets the media query rule beat
the inline style's specificity when it does apply).

## Tests

Blade views aren't rendered by Vitest, and there's no snapshot test
for `emails/*.blade.php` content today — the closest existing coverage
is `tests/Feature/Notifications/NotificationMailTest.php`'s
`$mail->render()` assertions (asserting rendered HTML `toContain(...)`
specific text), which exercise the view but don't assert anything
about the dark/light CSS. If you add a genuinely new class + media
query rule, there's nothing more to add than the usual "does this
notification's view render the expected content" assertion already
covered by that pattern — manually check both variants by setting your
mail client (or a preview tool that supports `prefers-color-scheme`,
e.g. the "Litmus"/"Email on Acid" style of testing service) to each
mode, since there's no automated way to assert on `@media` behavior
from Pest/Vitest.
