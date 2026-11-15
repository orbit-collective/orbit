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
**Disconnect GitHub** and **Refresh GitHub repositories**. They all sit under **Suggested** so they are the first thing on the
page. A command is
only registered when it would work (no toggle without
`integrations.update`, no Enable for a "coming soon" entry, no Connect
while an installation is pending). The texts live in
`lang/<locale>/hook_integration_commands.php`.

## Search and filters on the overview

The overview filters in the browser, on the catalog that is already
there, so nothing is requested while typing. `WorkspaceSettingsIntegrationsTab`
holds three independent filters: a search field, the category pills and a
status control (All / Enabled / Disabled / Coming soon, a
`SegmentedControl`). They combine: a card shows only if it passes all three.

- **Search** (`matchesSearch()` in `utils/integrationFilters.ts`): every
  word has to appear, in any order, in the name, vendor, description or
  category as the user reads them (the translated texts), ignoring case
  and accents. Escape or the clear button empties the field.
- **State** (`integrationState()`): `soon` for a catalog entry that is not
  shipped, otherwise `enabled` or `disabled` from `integrationStatuses`
  (GitHub's value is "connected").
- **Counts**: the status buttons count what choosing them would show, with
  the search and the category applied; the category pills count with the
  search and the status applied.
- **Empty result**: a panel with a Clear filters button; a polite live
  region reads how many integrations are shown.
- **Palette**: **Search integrations** (under Suggested) puts the cursor in
  the field.

A new filter dimension follows the same shape: a pure helper in
`utils/integrationFilters.ts` (with a test), a state in the tab, and one
more condition in the tab's `inSearchAndCategory` / `filteredIntegrations`
chain, plus keys under `workspace_settings_integrations.tab` in both
languages.

## Layout and the filters toggle

Two more controls sit next to the search field, both remembered in this
browser (`useStoredChoice`, keys `integrations:view` and
`integrations:filters`):

- **Filters** (an icon button with `aria-expanded` and `aria-controls`)
  shows or hides the status and category filters inside a `Collapse`. A
  badge on the button counts the filters that are on, and a hidden
  filter keeps filtering.
- **Layout** (an icon-only `SegmentedControl`) switches between `grid`,
  the tall cards in `auto-fill` columns of at most 26rem, so a wide
  screen gets more columns instead of two stretched ones, and `list`, compact rows. Both are the same
  `WorkspaceSettingsIntegrationCard`, through its `variant` (`card` or
  `row`): a new element on a card goes into both layouts.

The palette has **Show or hide the filters**, **Show integrations as a
grid** and **Show integrations as a list** under Suggested.

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
