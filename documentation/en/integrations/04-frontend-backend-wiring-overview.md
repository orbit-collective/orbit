# Frontend ↔ backend wiring overview

A map of the whole feature, useful to read before diving into any of
the other guides. Three separate flows: **reading** the settings page,
**writing** a toggle/webhook/option, and **activity happening**
somewhere else in the app reaching Discord.

## 1. Reading: how the Integrations tab gets its data

```
GET /settings/integrations?project=<id>            (the overview)
GET /settings/integrations/{integration}?project=<id>   (one integration)
        │
        ▼
SettingsController::integrations()  /  ::integration($integration)
  - resolves $selectedProject from ?project= (or the user's first project)
  - computes $hasIntegrationsAccess / $canUpdateIntegrations directly off
    Project::hasPermission() (NOT via a Policy — Policies here are
    only for authorizing mutating requests, see
    ../permissions/01-add-a-new-permission.md step 4)
  - the overview only sends integrationStatuses (every integration's
    enabled state; GitHub's comes from GithubIntegrationService::isConnected())
  - an integration's page 404s for an id outside
    ProjectIntegrationService::CATALOG_INTEGRATIONS and sends only
    that integration's data: integrationId, integrationEnabled,
    integrationSettings (the webhookUrl is masked unless
    $canUpdateIntegrations), plus jiraSettings / jiraImportProgress /
    issueTypes / labels / priorities for Jira only and
    githubConnectStatus for GitHub only
        │
        ▼
resources/js/Pages/Settings/Integrations.tsx  /  IntegrationDetail.tsx
  - the overview's page and the integration's page, both inside
    SettingsLayout (tabId="integrations"; the detail page adds a
    breadcrumbTrail and hides the generic title, see
    ../settings-tabs/README.md)
        │
        ▼
WorkspaceSettingsIntegrationsTab.tsx  (overview)
  - if no project, or !hasIntegrationsAccess → an access-denied
    SettingsPanel
  - otherwise ProjectPickerPanel (only if >1 project), category filter
    pills and a WorkspaceSettingsIntegrationCard per catalog entry (from
    the static resources/js/types/Integrations.ts list — NOT server
    data), each a link to its own page with a switch next to it
WorkspaceSettingsIntegrationDetail.tsx  (one integration)
  - hero, preview banner, Details table, overview and the configuration
    panels (see 07-integration-pages.md)
```

**Key thing to internalize:** the *catalog* (name, icon, description,
sub-option definitions) is 100% static frontend data
(`resources/js/types/Integrations.ts`) — the server never sends it.
The server only ever sends **per-project state** for the catalog
entries it recognizes as available
(`ProjectIntegrationService::AVAILABLE_INTEGRATIONS`). A `comingSoon:
true` catalog entry simply never has a corresponding row in
`integrationStatuses`/`integrationSettings` — the frontend components
default to `false`/`null` for anything missing, which is exactly what
makes locked cards render correctly with zero special-casing.

## 2. Writing: toggling enabled, saving a webhook URL, flipping an option

Three different user actions, same two backend endpoints:

```
Card switch / the page's Enable button / a palette command
  → useIntegrationActions().toggleIntegration()
  → router.patch(route('projects.integrations.update', [projectId, integrationId]), { enabled })
  → PATCH /projects/{project}/integrations/{integration}
  → ProjectIntegrationController::update()
      $this->authorize('updateIntegrations', $project);   // ProjectPolicy
      validate 'enabled' => boolean
      ProjectIntegrationService::setEnabled()
      redirect()->back()->with('success', ...)
  → Inertia re-visits the current page, props refresh, UI reflects the new state
```

```
"Save" button (webhook URL) / option switch on the integration's page
  → useIntegrationActions().saveIntegrationSettings()
  → router.patch(route('projects.integrations.settings.update', [projectId, integrationId]), { webhook_url } | { options })
  → PATCH /projects/{project}/integrations/{integration}/settings
  → ProjectIntegrationController::updateSettings()
      $this->authorize('updateIntegrations', $project);
      validate 'webhook_url' => nullable string, 'options.*' => boolean
      ProjectIntegrationService::updateSettings()
        - rejects an unavailable integration (ValidationException)
        - validates webhook URL format per-integration (regex map)
        - whitelists + merges option keys per-integration (never
          clobbers keys not present in the request)
      redirect()->back()->with('success', ...)
```

Every one of these requests is a `router.patch(...)` with
`preserveScroll: true, preserveState: true` and `onSuccess`/`onError`
callbacks that call `addAlert(...)` from `useAlert()` — see
`resources/js/hooks/useIntegrationActions.ts` for the exact options object to
copy for a new mutating action.

## 3. Activity happening: how a comment/issue update reaches Discord

This is the part that's easy to get wrong (see guide 3's callout about
the `CommentAdded` bug) — walk through it once end to end:

```
CommentService::addComment() / IssueService::createIssue()/updateIssue()
  → event(new CommentAdded(...))  /  event(new IssueAssigned(...)) etc.
      (fires UNCONDITIONALLY — no "should someone be notified" check here)
        │
        ├──────────────────────────────┬─────────────────────────────────┐
        ▼                               ▼                                 
  SendNotificationListener        NotifyProjectIntegrationsListener
  (registered in                  (registered in
   AppServiceProvider::boot())     AppServiceProvider::boot())
        │                               │
  decides per-event whether        resolveContext($event) → [$project, $category]
  a specific user should be              │
  notified in-app/by email         for each ENABLED ProjectIntegration on
  (e.g. "not the assignee's        that $project where options[$category]
  own comment") — this is          is true:
  where that filtering              → IntegrationNotifierRegistry::resolve($key)
  actually belongs now              → $notifier->handle($projectIntegration, $event)
        │                               │
  NotificationService::notify()    DiscordIntegrationNotifier::handle()
  (respects the user's own          - builds an embed keyed on the event's class
   NotificationSetting rows)        - SendWebhookNotificationJob::dispatch(url, payload)
                                          │
                                          ▼
                                    queued (QUEUE_CONNECTION=database) —
                                    a worker must be running
                                    (php artisan queue:work) for it to
                                    actually send; nothing happens
                                    synchronously in the request
                                          │
                                          ▼
                                    Http::post($webhookUrl, $payload)
```

Both listeners consume the **same event instances** — they're
independent, parallel consumers, not a chain. Neither knows the other
exists. This is what makes it safe to add a third consumer later (say,
an audit log listener) without touching either existing one — just
register it for the same event classes in `AppServiceProvider::boot()`.

## Full file map, by layer

**Frontend — static data:**
- `resources/js/types/Integrations.ts` — the catalog (`INTEGRATIONS`,
  `IntegrationDefinition`, categories)
- `resources/js/Components/Atoms/BrandIcon/BrandIcon.tsx` — logo SVGs
- `resources/js/utils/integrationCategoryColors.ts` — category badge colors

**Frontend — components:**
- `resources/js/Pages/Settings/Integrations.tsx` and `IntegrationDetail.tsx` — the overview's page and one integration's page: prop threading
- `resources/js/Components/Organisms/SettingsLayout/SettingsLayout.tsx` — sidebar + heading chrome shared by every settings page
- `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIntegrationsTab.tsx` — the overview: project picker, filters, grid of cards
- `.../WorkspaceSettingsIntegrationCard.tsx` — one grid card (a link plus a switch)
- `.../WorkspaceSettingsIntegrationDetail.tsx` — the body of an integration's page
- `.../WorkspaceSettingsIntegrationHero.tsx`, `...NotifyPanel.tsx`, `...Preview.tsx` — its header, the webhook/options panel and the mock activity feed
- `resources/js/hooks/useIntegrationActions.ts` — every action (toggle, settings, Jira import, GitHub flow)
- `resources/js/hooks/useIntegrationCommands.ts` — the command palette commands
- `resources/js/types/ProjectIntegrations.ts` — the per-project settings shape sent from the server

**Backend — data layer:**
- `database/migrations/2026_08_25_120000_create_project_integrations_table.php`
  and `..._add_webhook_url_and_options_to_project_integrations_table.php`
- `app/Models/ProjectIntegration.php`
- `app/Repositories/ProjectIntegrationRepository.php`
- `app/Services/ProjectIntegrationService.php` — the only place that
  knows which integrations/options/webhook formats are valid

**Backend — authorization:**
- `app/Enums/Permissions/Permission.php` — `INTEGRATIONS_VIEW`/`INTEGRATIONS_UPDATE`
- `app/Services/RoleService.php` — default grants per tier (system role)
- `app/Policies/ProjectPolicy.php` — `viewIntegrations`/`updateIntegrations`
- `app/Http/Controllers/SettingsController.php` — computes the UI-facing booleans
- `app/Http/Controllers/ProjectIntegrationController.php` — authorizes + validates mutations
- `routes/web.php` — `settings.integrations` (the overview), `settings.integrations.show` (one integration) plus `projects.integrations.update` / `projects.integrations.settings.update` (the mutations)

**Backend — event-driven delivery:**
- `app/Events/*.php` — the domain facts (`IssueAssigned`, `IssueUnassigned`, `IssueUpdated`, `CommentAdded`, ...)
- `app/Providers/AppServiceProvider.php` — wires event classes to listeners
- `app/Listeners/SendNotificationListener.php` — in-app/email notifications
- `app/Listeners/NotifyProjectIntegrationsListener.php` — event → category → enabled integrations
- `app/Contracts/IntegrationNotifier.php` — the interface every integration implements
- `app/Services/Integrations/IntegrationNotifierRegistry.php` — integration key → notifier class map
- `app/Services/Integrations/DiscordIntegrationNotifier.php` — Discord's embed builder
- `app/Jobs/SendWebhookNotificationJob.php` — generic queued "POST this JSON to this URL"

## Local testing checklist

1. Run the migration + `php artisan db:seed --class=PermissionSeeder`
   if you added a permission (see
   ../permissions/01-add-a-new-permission.md step 6 — this is the #1
   "why isn't my new thing showing up" cause).
2. Make sure a queue worker is actually running —
   `php artisan queue:work` (or it's part of `composer dev` already) —
   or `SendWebhookNotificationJob` will sit queued forever and nothing
   will reach Discord even though everything else worked.
3. Use a real (or throwaway) Discord webhook URL to see an actual
   message land — `https://discord.com/api/webhooks/<id>/<token>`,
   created from a Discord server's Integrations → Webhooks settings.
