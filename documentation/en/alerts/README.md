# UI alerts (toasts)

The small, transient toast in the top-right corner of the screen — a
one-line confirmation or error, auto-dismissing after a few seconds —
is a completely different system from
[notifications](../notifications/README.md): it's client-side only,
ephemeral, never persisted, and has nothing to do with
`NotificationType`/`NotificationSetting`. This category documents how
it works and the two independent ways to trigger one.

## Guides, in the order you'd actually need them

1. **[Trigger an alert from a backend action](./01-trigger-an-alert-from-the-backend.md)**
   — the zero-frontend-code way: flash a specific key on a redirect
   response and it shows up as a toast automatically. Covers the one
   easy mistake: the flash key vocabulary here is *not* the same as
   the `Notification` model's severity vocabulary.
2. **[Trigger an alert from the frontend](./02-trigger-an-alert-from-the-frontend.md)**
   — calling `addAlert()` directly for actions that never round-trip
   through a redirect (a clipboard copy, an optimistic toggle). Worked
   example: adding the confirmation toast that `IssuePageHeader`'s
   "copy issue link" button doesn't have today.

## The architecture in one paragraph

`AlertProvider` (mounted once, near the root of `app.tsx`) owns the
whole system: an in-memory list of `AlertItem`s, rendered by
`AlertContainer`/`Alert` as a fixed top-right stack with a
`framer-motion` enter/exit animation, each auto-removed after a
duration (default 4000ms; pass `0` to keep it until the user
dismisses it manually). There are exactly two ways an alert gets
added to that list. **Automatically**: `AlertProvider` watches every
Inertia page load (an effect for the very first, server-rendered one)
and every subsequent visit (`router.on('success', ...)`, chosen over a
`usePage()` effect specifically because Inertia reuses the same
`flash` object reference across visits with identical content, which
would silently skip a second identical flash under a naive effect) and
turns four specific flash keys — `success`, `error`, `warning`,
`information` — plus an optional sibling `action_url` key into a call
to `addAlert()`. **Manually**: any component can call `useAlert().addAlert(message, type, duration, actionUrl)`
directly, with no backend round-trip involved at all — see guide 2 for
when that's the right call.
