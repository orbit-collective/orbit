# Integrations

Orbit lets a project connect third-party tools, along two separate
axes: **notify** integrations (Discord today; Slack, GitHub, and others
are shown in the catalog as "coming soon") push Orbit activity out via
a webhook, and **import** integrations (Jira today; Linear, Asana,
Trello are catalog-only stubs) pull issues/epics/subtasks in from a
remote system on request. This category documents the whole system:
the frontend catalog, the per-project settings persisted in the
database, the event-driven pipeline that turns "something happened in
Orbit" into "a message landed in Discord", and the pull-based pipeline
that turns "a user clicked Import" into "Jira's issues exist in Orbit".

## Guides, in the order you'd actually need them

1. **[Add a new integration](./01-add-a-new-integration.md)** — turn a
   "coming soon" catalog entry (or a brand new one) into a real,
   working **notify** integration end to end.
2. **[Add integration settings](./02-add-integration-settings.md)** —
   give a notify integration its own config shape beyond "enabled" and
   a webhook URL (e.g. a channel name, an API key, a numeric option).
3. **[Add a new event type](./03-add-a-new-event-type.md)** — wire up
   an entirely new kind of activity (using `IssueCreated` as the
   worked example) so both user notifications and notify integrations
   can react to it.
4. **[Frontend ↔ backend wiring overview](./04-frontend-backend-wiring-overview.md)**
   — the full request/response shape for the notify-integration
   feature, useful as a map before diving into guides 1–3.
5. **[Add an import integration](./05-add-an-import-integration.md)**
   — turn a "coming soon" catalog entry into a real, working **import**
   integration (using Linear as the worked example, built from Jira's
   already-complete implementation).

Need to gate a new integration ability behind its own permission? See
[`../permissions/01-add-a-new-permission.md`](../permissions/01-add-a-new-permission.md)
in the [roles & permissions](../permissions/README.md) category — that
guide isn't repeated here since it applies to any `projects.*`/
`issues.*`/`comments.*` permission, not just integration ones.

## The architecture in one paragraph

The frontend has a **static catalog** (`resources/js/types/Integrations.ts`)
of every integration Orbit could ever support — name, icon, category,
description, sub-options, and a `kind: 'notify' | 'import'`
discriminator — regardless of whether it's actually wired up yet
(`comingSoon: true/false`). Per-project state (is it enabled, its
webhook URL/credentials, which sub-options are on) lives in one
database table, `project_integrations`. For **notify** integrations,
domain events (`App\Events\*`) that already exist for in-app/email
notifications — `IssueAssigned`, `IssueUnassigned`, `IssueUpdated`,
`CommentAdded` — are *also* consumed by a second listener,
`NotifyProjectIntegrationsListener`, which maps each event to a
sub-option category (`issue-activity` / `comment-activity`) and hands
it to whichever `IntegrationNotifier` the event's project has enabled
for that category. For **import** integrations, there's no event to
react to — a controller action dispatches a queued job that resolves
an `IntegrationImporter`, maps the remote system's raw payload into a
source-agnostic `ExternalIssueDTO`, and hands every DTO to the shared
`ImportOrchestratorService`, which handles dedup (`external_issue_links`),
field mapping (`integration_field_mappings`), and hierarchy
(`Issue::parent_id`) the same way regardless of which remote system
produced the DTO. Adding an integration, a new kind of event, or a new
importer never requires touching the other axis's plumbing — see the
guides for exactly where each new piece plugs in.
