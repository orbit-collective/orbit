# Settings tabs

`/settings` is not one page — every tab under it (Preferences,
Profile, Notifications, Security & access, Export in the Account
section; Labels, Issue Types, Priorities, Documents, Members, Roles &
management, Integrations in the Workspace section) is its own route,
its own controller action and its own Inertia page, so visiting a tab
only loads that tab's data. One registry array,
`SETTINGS_TABS`, still describes every tab for the nav. This category
documents that registry plus the route/controller/page trio behind it,
and the two distinct shapes of "add a tab": turning an already-built
placeholder live, and adding a genuinely new one from scratch.

## Guides, in the order you'd actually need them

1. **[Flip a placeholder tab live](./01-flip-a-placeholder-tab-live.md)**
   — worked example turning the already-built Export tab on, the same
   "the UI already exists, just make it reachable and real" shape as
   [`../integrations/01-add-a-new-integration.md`](../integrations/01-add-a-new-integration.md)'s
   Slack example.
2. **[Add a brand-new settings tab](./02-add-a-brand-new-settings-tab.md)**
   — worked example adding a `billing` tab that doesn't exist at all
   yet: the type, the registry entry, the route, the controller
   action, the page and the tab component.

## The architecture in one paragraph

`SETTINGS_TABS` (`resources/js/types/Settings.ts`) is a flat array of
every tab — id, `path` (its URL), label, icon, `section`
(`'account'` or `'workspace'`), description, and an `enabled` boolean.
Each enabled tab has a matching route in `routes/web.php`
(`/settings/<id>`, route name `settings.<id>`) pointing at its own
`SettingsController` action, which renders its own page under
`resources/js/Pages/Settings/` and passes **only** the props that tab
renders — `Settings/Members` never ships integration settings,
`Settings/Preferences` never ships the member list. `/settings` itself
is just a redirect to the default tab (`settings.preferences`).
Disabled tabs have no route at all: they show in the nav with a "Soon"
badge, and `Sidebar.tsx` renders them as a plain `div` rather than a
link, so they're unreachable both by clicking and by URL. Each page is
a thin wrapper: it declares its props and renders its tab component
inside `SettingsLayout`
(`resources/js/Components/Organisms/SettingsLayout/SettingsLayout.tsx`),
which draws the `Sidebar` plus the breadcrumb/heading/description read
straight off the tab's registry entry — which is why every page also
gets a `projects` prop (the Sidebar needs it) and why no page repeats
its own title copy. The tab components themselves still live in
`Components/Organisms/AccountSettingsContent/` and
`Components/Organisms/WorkspaceSettingsContent/`, one `*Tab.tsx` per
tab, unchanged by this split — only the thing that decides which one
renders moved from a client-side `if` chain to the router. Project-
scoped Workspace tabs additionally take `memberProjects` /
`selectedProjectId` for the project switcher and resolve the selected
project from a `?project=<id>` query string, which is the one query
parameter settings still uses; switching projects re-visits the *same*
tab path with a new `?project=`.
