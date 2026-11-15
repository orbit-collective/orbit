# Integration pages

Every integration has its own page, `/settings/integrations/<id>`,
instead of a modal on the overview. The overview
(`/settings/integrations`) only knows each integration's enabled state;
everything an integration needs to show and change (the Jira mappings,
the GitHub repositories, the project's issue types, labels and
priorities) is loaded by that integration's own route, so opening the
list stays cheap however much a single integration carries. This guide
is how the pieces fit and what to touch when you add something to them.

## How a request flows

```
GET /settings/integrations                    → SettingsController::integrations()
GET /settings/integrations/{integration}      → SettingsController::integration()
```

- Route names: `settings.integrations` and `settings.integrations.show`.
  Build links with `integrationPath(id, projectId)` /
  `integrationsPath(projectId)` (`resources/js/utils/integrationPaths.ts`),
  on the server with `route('settings.integrations.show', ['integration'
  => 'jira', 'project' => $project->id])`.
- `integration()` aborts with a 404 unless the id is in
  `ProjectIntegrationService::CATALOG_INTEGRATIONS`. That list mirrors
  the frontend catalog (`resources/js/types/Integrations.ts`) —
  **a new catalog id must be added to both.**
- The page props are the integration's own: `integrationId`,
  `integrationEnabled`, `integrationSettings` (one integration's
  settings, never the map) and the access flags. Data only one
  integration reads is gated on its id: `jiraSettings`,
  `jiraImportProgress`, `issueTypes`, `labels` and `priorities` are only
  sent for `jira`, `githubConnectStatus` only for `github`. Anything
  heavy a **new** integration needs follows the same rule: compute it in
  `integration()` behind `$integration === '<id>'`, never in the
  overview.
- The overview's `integrationStatuses` is `getStatuses()` plus GitHub's
  `GithubIntegrationService::isConnected()` — one local row read, not the
  full connect status.

## The frontend pieces

| File | What it is |
|---|---|
| `Pages/Settings/IntegrationDetail.tsx` | the page: looks the id up in `INTEGRATIONS`, wraps the body in `SettingsLayout tabId="integrations"` with `hideTitle` and a `breadcrumbTrail` |
| `.../WorkspaceSettingsIntegrationDetail.tsx` | the body: project picker, hero, preview banner, Details table, overview, configuration; registers the palette commands |
| `.../WorkspaceSettingsIntegrationHero.tsx` | mark, name, state, description, Enable / Disable and the website link |
| `.../WorkspaceSettingsIntegrationNotifyPanel.tsx` | webhook URL and option switches of a `notify` integration |
| `.../WorkspaceSettingsImportPanel.tsx`, `...GithubConnectPanel.tsx` | the `import` and `github` configuration |
| `Components/Molecules/DetailsTable` | the label / value rows under "Details" |
| `hooks/useIntegrationActions.ts` | every mutation (toggle, settings, Jira import with its progress toast, the GitHub flow and its polling) |
| `hooks/useIntegrationCommands.ts` | the command palette commands |

`SettingsLayout` takes two props for a page that sits below a tab:
`breadcrumbTrail` (crumbs after the tab's, which then links back) and
`hideTitle` (the page brings its own heading). `getSettingsTabByPath()`
matches a path *under* a tab, so the sidebar keeps Integrations active.

## Adding something to an integration's page

- **A new fact in "Details"**: add a row to the `DetailsTable` in
  `WorkspaceSettingsIntegrationDetail.tsx` (`icon`, a translated `label`,
  a `value`) and its key under `workspace_settings_integrations.detail`
  in `lang/en` and `lang/pl`.
- **A new configuration section**: render it inside the
  "Configuration" section of the same file, gated on
  `integration.kind` (or the id) and `showConfiguration`. Mutations go
  through `useIntegrationActions` so they get the same toast and
  `preserveScroll` handling.
- **A new action**: add it to `useIntegrationActions` (return it), call
  it from the page, and — if it is worth a keystroke — add a command.

## Command palette

`useIntegrationListCommands` (overview) registers **Open integration:
<name>** for every integration and **Enable / Disable <name>** for the
ones that are a plain toggle. `useIntegrationCommands` (an integration's
page) registers **Back to integrations**, **Open the <name> website**,
**Enable / Disable <name>** and, for GitHub, **Connect GitHub**,
**Disconnect GitHub** and **Refresh GitHub repositories**. A command is
only registered when it would work (no toggle without
`integrations.update`, no Enable for a "coming soon" entry, no Connect
while an installation is pending). The texts live in
`lang/<locale>/hook_integration_commands.php`.

## Keyboard and small screens

- A card is a single Tab stop: the integration name is a link that is
  stretched over the card (`after:absolute after:inset-0`), and the
  on/off switch is a separate, labelled control (`role="switch"`), never
  a button inside a link. The category pills are a named group.
- The page uses semantic headings (`h1` the integration, `h2`
  sections), a `dl` for Details and real links / buttons, so it can be
  read and used without a mouse. The webhook field is a form: Enter
  saves.
- The hero actions wrap, the Details rows stack under `sm`, and the
  preview banner shrinks its padding; nothing scrolls sideways.

## Tests

- PHP: `tests/Feature/SettingsControllerTest.php` — the overview carries
  no per-integration data, the page 404s for an unknown id, Jira's and
  GitHub's data is only sent on their own page.
- Vitest: `WorkspaceSettingsIntegrationDetail.test.tsx` (the page and
  every flow that used to live in the modal), `...IntegrationCard.test.tsx`,
  `...IntegrationsTab.test.tsx`, `useIntegrationCommands.test.ts`,
  `DetailsTable.test.tsx`.
