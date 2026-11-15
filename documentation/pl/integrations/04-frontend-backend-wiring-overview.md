# Przegląd połączenia frontend ↔ backend

Mapa całej funkcji, przydatna do przeczytania przed zagłębieniem się w którykolwiek z pozostałych przewodników. Trzy oddzielne przepływy: **czytanie** strony ustawień, **zapisywanie** przełącznika/webhooka/opcji oraz **aktywność dziejąca się** gdzie indziej w aplikacji, która dociera do Discorda.

## 1. Czytanie: skąd zakładka Integrations bierze swoje dane

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

**Rzecz kluczowa do zapamiętania:** *katalog* (nazwa, ikona, opis, definicje pod-opcji) to w 100% statyczne dane frontendowe (`resources/js/types/Integrations.ts`) — serwer nigdy ich nie wysyła. Serwer wysyła jedynie **stan per-projekt** dla wpisów katalogu, które rozpoznaje jako dostępne (`ProjectIntegrationService::AVAILABLE_INTEGRATIONS`). Wpis katalogu z `comingSoon: true` po prostu nigdy nie ma odpowiadającego wiersza w `integrationStatuses`/`integrationSettings` — komponenty frontendowe domyślnie ustawiają `false`/`null` dla wszystkiego, czego brakuje, co jest właśnie tym, co sprawia, że zablokowane karty renderują się poprawnie bez żadnego specjalnego kodu.

## 2. Zapisywanie: przełączanie enabled, zapisywanie URL-a webhooka, przełączanie opcji

Trzy różne akcje użytkownika, te same dwa endpointy backendowe:

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

Każde z tych żądań to `router.patch(...)` z `preserveScroll: true, preserveState: true` oraz callbackami `onSuccess`/`onError`, które wywołują `addAlert(...)` z `useAlert()` — zobacz `resources/js/hooks/useIntegrationActions.ts` po dokładny obiekt opcji do skopiowania dla nowej akcji mutującej.

## 3. Dziejąca się aktywność: jak komentarz/aktualizacja issue dociera do Discorda

To jest część, którą łatwo zepsuć (zobacz notatkę o błędzie z `CommentAdded` w przewodniku 3) — przejdźmy przez to raz, od początku do końca:

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

Oba listenery konsumują **te same instancje eventów** — są niezależnymi, równoległymi konsumentami, nie łańcuchem. Żaden nie wie o istnieniu drugiego. To właśnie sprawia, że bezpiecznie można dodać trzeciego konsumenta później (powiedzmy, listener dziennika audytu) bez dotykania żadnego z dwóch istniejących — wystarczy zarejestrować go dla tych samych klas eventów w `AppServiceProvider::boot()`.

## Pełna mapa plików, według warstwy

**Frontend — dane statyczne:**
- `resources/js/types/Integrations.ts` — the catalog (`INTEGRATIONS`,
  `IntegrationDefinition`, categories)
- `resources/js/Components/Atoms/BrandIcon/BrandIcon.tsx` — logo SVGs
- `resources/js/utils/integrationCategoryColors.ts` — category badge colors

**Frontend — komponenty:**
- `resources/js/Pages/Settings/Integrations.tsx` i `IntegrationDetail.tsx` — strona przeglądu i strona jednej integracji: przekazywanie propsów
- `resources/js/Components/Organisms/SettingsLayout/SettingsLayout.tsx` — sidebar + heading chrome shared by every settings page
- `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIntegrationsTab.tsx` — przegląd: wybór projektu, filtry, siatka kart
- `.../WorkspaceSettingsIntegrationCard.tsx` — one grid card (a link plus a switch)
- `.../WorkspaceSettingsIntegrationDetail.tsx` — the body of an integration's page
- `.../WorkspaceSettingsIntegrationHero.tsx`, `...NotifyPanel.tsx`, `...Preview.tsx` — its header, the webhook/options panel and the mock activity feed
- `resources/js/hooks/useIntegrationActions.ts` — every action (toggle, settings, Jira import, GitHub flow)
- `resources/js/hooks/useIntegrationCommands.ts` — the command palette commands
- `resources/js/types/ProjectIntegrations.ts` — the per-project settings shape sent from the server

**Backend — warstwa danych:**
- `database/migrations/2026_08_25_120000_create_project_integrations_table.php`
  and `..._add_webhook_url_and_options_to_project_integrations_table.php`
- `app/Models/ProjectIntegration.php`
- `app/Repositories/ProjectIntegrationRepository.php`
- `app/Services/ProjectIntegrationService.php` — the only place that
  knows which integrations/options/webhook formats are valid

**Backend — autoryzacja:**
- `app/Enums/Permissions/Permission.php` — `INTEGRATIONS_VIEW`/`INTEGRATIONS_UPDATE`
- `app/Services/RoleService.php` — default grants per tier (system role)
- `app/Policies/ProjectPolicy.php` — `viewIntegrations`/`updateIntegrations`
- `app/Http/Controllers/SettingsController.php` — computes the UI-facing booleans
- `app/Http/Controllers/ProjectIntegrationController.php` — authorizes + validates mutations
- `routes/web.php` — `settings.integrations` (przegląd), `settings.integrations.show` (jedna integracja) plus `projects.integrations.update` / `projects.integrations.settings.update` (the mutations)

**Backend — dostarczanie oparte na eventach:**
- `app/Events/*.php` — the domain facts (`IssueAssigned`, `IssueUnassigned`, `IssueUpdated`, `CommentAdded`, ...)
- `app/Providers/AppServiceProvider.php` — wires event classes to listeners
- `app/Listeners/SendNotificationListener.php` — in-app/email notifications
- `app/Listeners/NotifyProjectIntegrationsListener.php` — event → category → enabled integrations
- `app/Contracts/IntegrationNotifier.php` — the interface every integration implements
- `app/Services/Integrations/IntegrationNotifierRegistry.php` — integration key → notifier class map
- `app/Services/Integrations/DiscordIntegrationNotifier.php` — Discord's embed builder
- `app/Jobs/SendWebhookNotificationJob.php` — generic queued "POST this JSON to this URL"

## Lokalna checklista testowania

1. Uruchom migrację + `php artisan db:seed --class=PermissionSeeder`,
   jeśli dodałeś uprawnienie (zobacz ../permissions/01-add-a-new-permission.md,
   krok 6 — to jest przyczyna numer jeden problemu "dlaczego moja nowa rzecz się nie pojawia").
2. Upewnij się, że faktycznie działa worker kolejki —
   `php artisan queue:work` (albo jest już częścią `composer dev`) —
   inaczej `SendWebhookNotificationJob` będzie tkwić zakolejkowane
   w nieskończoność i nic nie dotrze do Discorda, mimo że wszystko
   inne zadziałało.
3. Użyj prawdziwego (albo jednorazowego) URL-a webhooka Discorda,
   żeby zobaczyć, jak faktyczna wiadomość dociera —
   `https://discord.com/api/webhooks/<id>/<token>`, stworzonego
   w ustawieniach Integrations → Webhooks serwera Discorda.
