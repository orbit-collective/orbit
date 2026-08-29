# Settings tabs

`/settings` is a single Inertia page (`Pages/Settings/Index.tsx`)
covering both the Account section (Preferences, Profile, Notifications,
Security & access, Export) and the Workspace section (Members, Roles &
management, Integrations, Labels, Statuses, Priorities, Templates,
Documents) — which tab renders, whether it's reachable at all, and
which of the two big content components (`AccountSettingsContent` /
`WorkspaceSettingsContent`) owns it are all driven by one registry
array, `SETTINGS_TABS`. This category documents that registry and the
two distinct shapes of "add a tab": turning an already-built
placeholder live, and adding a genuinely new one from scratch.

## Guides, in the order you'd actually need them

1. **[Flip a placeholder tab live](./01-flip-a-placeholder-tab-live.md)**
   — worked example turning the already-built Export tab on, the same
   "the UI already exists, just make it reachable and real" shape as
   [`../integrations/01-add-a-new-integration.md`](../integrations/01-add-a-new-integration.md)'s
   Slack example.
2. **[Add a brand-new settings tab](./02-add-a-brand-new-settings-tab.md)**
   — worked example adding a `billing` tab that doesn't exist at all
   yet: the type, the registry entry, the component, and the switch
   that routes to it.

## The architecture in one paragraph

`SETTINGS_TABS` (`resources/js/types/Settings.ts`) is a flat array of
every tab — id, label, icon, `section` (`'account'` or `'workspace'`),
description, and an `enabled` boolean. `Pages/Settings/Index.tsx`
resolves the active tab from the `?tab=` query string, but only
accepts it if `isSettingsTabId()` **and** `isEnabledSettingsTabId()`
both pass — an unknown or `enabled: false` tab id silently falls back
to `SETTINGS_DEFAULT_TAB` (`'preferences'`) rather than erroring, so a
disabled tab is unreachable by URL just as much as by clicking it in
the sidebar. Two more type guards, `isAccountSettingsTabId()` /
`isWorkspaceSettingsTabId()`, decide which of the two content
components — `AccountSettingsContent` or `WorkspaceSettingsContent` —
renders; each of those is itself a flat `if (tabId === '...') return
<...Tab />` chain, not a lookup table, so a new tab needs a new branch
in whichever one it belongs to. The backend has no matching concept of
"tabs" at all — `SettingsController::index()` always computes and
returns props for **every** tab's data on every request regardless of
which one is active (see
[`../architecture/03-frontend-architecture-and-atomic-design.md`](../architecture/03-frontend-architecture-and-atomic-design.md)
for why this over-fetching is an acceptable, deliberate simplification
here), so a disabled tab having no real backend data yet is never a
blocker to enabling the UI shell — only to it doing anything real.
