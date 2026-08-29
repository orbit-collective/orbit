# Orbit developer documentation (English)

This folder holds step-by-step, copy-pasteable guides for extending
subsystems in this codebase. It's aimed at "how do I add X" questions —
not architecture overviews (those belong in `CLAUDE.md`) and not API
reference (read the code for that).

A Polish translation of every guide here lives in
[`../pl/`](../pl/README.md), mirroring this same structure file for
file. See `../README.md` for how the two are kept in sync.

## Structure

One subfolder per subsystem/feature area. Each subfolder has its own
`README.md` indexing the guides inside it.

```
documentation/
  README.md                  <- language index (English/Polski)
  en/
    README.md                <- this file
    integrations/
      README.md              <- index for this category
      01-add-a-new-integration.md
      02-add-integration-settings.md
      03-add-a-new-event-type.md
      04-frontend-backend-wiring-overview.md
    permissions/
      README.md              <- index for this category
      01-add-a-new-permission.md
      02-add-a-new-role-tier.md
      03-grant-a-custom-role-in-bulk.md
    notifications/
      README.md              <- index for this category
      01-add-a-new-notification-type.md
      02-send-a-notification-from-your-code.md
      03-frontend-backend-wiring-overview.md
  pl/
    README.md                <- Polish translation of this file
    integrations/            <- Polish translation of every guide above
    permissions/             <- Polish translation of every guide above
    notifications/           <- Polish translation of every guide above
```

## When to add or update a guide here

Whenever you build something **genuinely new** — a new subsystem, a new
kind of extensible thing (a new "plug a new X in here" point), a new
category of permission, a new event-driven flow — add a guide (or a new
numbered step in an existing category) that shows, with real code from
this repo, exactly how to extend it next time. Do this **before**
considering the feature done.

Small, one-off changes to existing code don't need a new guide — only
document a genuinely new extension point once it exists, so the next
person (or the next session) doesn't have to reverse-engineer it from
the diff.

Guides must:
- Be `.md` files.
- Be actually step-by-step (numbered steps, in the order you'd really
  do them).
- Include full, working code — not fragments with `// ...` gaps —
  copied from (or written in the exact style of) the real files in this
  repo, with their real paths.
- Point at the actual test files to update/add, not just the
  production code.
- Exist in **both** `en/` and `pl/`, at the same relative path. Write
  the English version first, then add/update its Polish counterpart in
  the same commit — see `../README.md` for the translation rule (code
  blocks stay verbatim in English; only prose gets translated).

See `integrations/README.md` for a worked example of this format.
