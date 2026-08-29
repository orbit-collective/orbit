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
      04-add-a-dedicated-transactional-email.md
    alerts/
      README.md              <- index for this category
      01-trigger-an-alert-from-the-backend.md
      02-trigger-an-alert-from-the-frontend.md
      03-add-a-new-alert-type.md
      04-customize-alert-behavior.md
      05-testing-components-that-use-alerts.md
    theme-colors/
      README.md              <- index for this category
      01-how-theme-switching-works.md
      02-add-a-new-theme-color-token.md
      03-use-a-theme-color-in-a-component.md
      04-theme-colors-in-emails.md
    accent-colors/
      README.md              <- index for this category
      01-add-a-new-accent-color.md
      02-use-the-accent-color-in-a-component.md
    architecture/
      README.md              <- index for this category
      01-tech-stack-and-project-structure.md
      02-backend-layered-architecture.md
      03-frontend-architecture-and-atomic-design.md
      04-docker-doppler-and-deployment.md
      05-scope-and-non-goals.md
    settings-tabs/
      README.md              <- index for this category
      01-flip-a-placeholder-tab-live.md
      02-add-a-brand-new-settings-tab.md
    shortcuts/
      README.md              <- index for this category
      01-register-a-component-scoped-shortcut.md
      02-register-a-global-shortcut.md
    content-moderation/
      README.md              <- index for this category
      01-add-moderation-to-a-new-upload-point.md
      02-configure-and-tune-moderation.md
    project-invitations/
      README.md              <- index for this category
      01-invite-multiple-emails-at-once.md
    activity-log/
      README.md              <- index for this category
      01-log-a-new-kind-of-activity.md
      02-surface-the-activity-log-in-the-ui.md
    saved-filters/
      README.md              <- index for this category
      01-extract-the-service-layer.md
      02-make-context-scope-which-filters-show.md
    label-colors/
      README.md              <- index for this category
      01-add-a-new-label.md
    issue-views/
      README.md              <- index for this category
      01-add-a-new-issue-view.md
    rich-text-editor/
      README.md              <- index for this category
      01-add-a-new-tiptap-extension.md
    project-onboarding/
      README.md              <- index for this category
      01-add-a-welcome-tour-slide.md
  pl/
    README.md                <- Polish translation of this file
    integrations/            <- Polish translation of every guide above
    permissions/             <- Polish translation of every guide above
    notifications/           <- Polish translation of every guide above
    alerts/                  <- Polish translation of every guide above
    architecture/            <- Polish translation of every guide above
    theme-colors/            <- Polish translation of every guide above
    accent-colors/           <- Polish translation of every guide above
    settings-tabs/           <- Polish translation of every guide above
    shortcuts/               <- Polish translation of every guide above
    content-moderation/      <- Polish translation of every guide above
    project-invitations/     <- Polish translation of every guide above
    activity-log/            <- Polish translation of every guide above
    saved-filters/           <- Polish translation of every guide above
    label-colors/            <- Polish translation of every guide above
    issue-views/             <- Polish translation of every guide above
    rich-text-editor/        <- Polish translation of every guide above
    project-onboarding/      <- Polish translation of every guide above
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
