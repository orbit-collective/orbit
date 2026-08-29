# Integrations

Orbit lets a project connect third-party tools (Discord today; Slack,
GitHub, and 19 others are shown in the catalog as "coming soon"). This
category documents the whole system: the frontend catalog, the
per-project settings persisted in the database, and the event-driven
pipeline that turns "something happened in Orbit" into "a message
landed in Discord".

## Guides, in the order you'd actually need them

1. **[Add a new integration](./01-add-a-new-integration.md)** — turn a
   "coming soon" catalog entry (or a brand new one) into a real,
   working integration end to end.
2. **[Add integration settings](./02-add-integration-settings.md)** —
   give an integration its own config shape beyond "enabled" and a
   webhook URL (e.g. a channel name, an API key, a numeric option).
3. **[Add a new event type](./03-add-a-new-event-type.md)** — wire up
   an entirely new kind of activity (using `IssueCreated` as the
   worked example) so both user notifications and integrations can
   react to it.
4. **[Frontend ↔ backend wiring overview](./04-frontend-backend-wiring-overview.md)**
   — the full request/response shape for the whole feature, useful as
   a map before diving into any of the guides above.

Need to gate a new integration ability behind its own permission? See
[`../permissions/01-add-a-new-permission.md`](../permissions/01-add-a-new-permission.md)
in the [roles & permissions](../permissions/README.md) category — that
guide isn't repeated here since it applies to any `projects.*`/
`issues.*`/`comments.*` permission, not just integration ones.

## The architecture in one paragraph

The frontend has a **static catalog** (`resources/js/types/Integrations.ts`)
of every integration Orbit could ever support — name, icon, category,
description, sub-options — regardless of whether it's actually wired up
yet (`comingSoon: true/false`). Per-project state (is it enabled, its
webhook URL, which sub-options are on) lives in one database table,
`project_integrations`. Domain events (`App\Events\*`) that already
exist for in-app/email notifications — `IssueAssigned`,
`IssueUnassigned`, `IssueUpdated`, `CommentAdded` — are *also* consumed
by a second listener, `NotifyProjectIntegrationsListener`, which maps
each event to a sub-option category (`issue-activity` /
`comment-activity`) and hands it to whichever `IntegrationNotifier` the
event's project has enabled for that category. Adding an integration or
a new kind of event never requires touching that listener — see the
guides for exactly where each new piece plugs in.
