# Przegląd połączenia frontend ↔ backend

Mapa całej funkcji, przydatna do przeczytania przed zagłębieniem się w którykolwiek z pozostałych przewodników. Trzy oddzielne przepływy: **czytanie** strony ustawień, **zapisywanie** przełącznika/webhooka/opcji oraz **aktywność dziejąca się** gdzie indziej w aplikacji, która dociera do Discorda.

## 1. Czytanie: skąd zakładka Integrations bierze swoje dane

```
GET /settings?tab=integrations&project=<id>
        │
        ▼
SettingsController::index()
  - resolves $selectedProject from ?project= (or the user's first project)
  - computes $hasIntegrationsAccess / $canUpdateIntegrations directly off
    Project::hasPermissionOrTier() (NOT via a Policy — Policies here are
    only for authorizing mutating requests, see guide 2 step 4)
  - calls ProjectIntegrationService::getStatuses() / getSettings()
  - masks the decrypted webhookUrl out of the payload unless
    $canUpdateIntegrations (SettingsController::mapIntegrationSettings())
        │
        ▼  Inertia props: memberProjects, selectedProjectId,
        │  integrationStatuses, integrationSettings,
        │  hasIntegrationsAccess, canUpdateIntegrations
        ▼
resources/js/Pages/Settings/Index.tsx
  - reads ?tab= from the URL, resolves the active SettingsTab
  - isWorkspaceSettingsTabId(activeTab) → true for 'integrations'
  - passes every one of the props above straight through, unmodified
        │
        ▼
WorkspaceSettingsContent.tsx
  - tabId === 'integrations' → renders WorkspaceSettingsIntegrationsTab
    with the same props, again just forwarded
        │
        ▼
WorkspaceSettingsIntegrationsTab.tsx
  - looks up selectedProject from memberProjects + selectedProjectId
  - if no project, or !hasIntegrationsAccess → renders an access-denied
    SettingsPanel and stops here
  - otherwise renders: ProjectPickerPanel (only if >1 project),
    category filter pills, a WorkspaceSettingsIntegrationCard per
    catalog entry (from the static resources/js/types/Integrations.ts
    list — NOT server data), each fed enabled={integrationStatuses[id]}
  - the currently-open card's full settings come from
    integrationSettings[id], passed to
    WorkspaceSettingsIntegrationDetailModal
```

**Rzecz kluczowa do zapamiętania:** *katalog* (nazwa, ikona, opis, definicje pod-opcji) to w 100% statyczne dane frontendowe (`resources/js/types/Integrations.ts`) — serwer nigdy ich nie wysyła. Serwer wysyła jedynie **stan per-projekt** dla wpisów katalogu, które rozpoznaje jako dostępne (`ProjectIntegrationService::AVAILABLE_INTEGRATIONS`). Wpis katalogu z `comingSoon: true` po prostu nigdy nie ma odpowiadającego wiersza w `integrationStatuses`/`integrationSettings` — komponenty frontendowe domyślnie ustawiają `false`/`null` dla wszystkiego, czego brakuje, co jest właśnie tym, co sprawia, że zablokowane karty renderują się poprawnie bez żadnego specjalnego kodu.

## 2. Zapisywanie: przełączanie enabled, zapisywanie URL-a webhooka, przełączanie opcji

Trzy różne akcje użytkownika, te same dwa endpointy backendowe:

```
Card toggle / modal Connect button
  → WorkspaceSettingsIntegrationsTab::toggleIntegration()
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
Modal "Save" button (webhook URL) / option toggle inside the modal
  → WorkspaceSettingsIntegrationsTab::saveIntegrationSettings()
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

Każde z tych żądań to `router.patch(...)` z `preserveScroll: true, preserveState: true` oraz callbackami `onSuccess`/`onError`, które wywołują `addAlert(...)` z `useAlert()` — zobacz `WorkspaceSettingsIntegrationsTab.tsx` po dokładny obiekt opcji do skopiowania dla nowej akcji mutującej.

## 3. Dziejąca się aktywność: jak komentarz/aktualizacja issue dociera do Discorda

To jest część, którą łatwo zepsuć (zobacz notatkę o błędzie z `CommentAdded` w przewodniku 4) — przejdźmy przez to raz, od początku do końca:

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
- `resources/js/Pages/Settings/Index.tsx` — top-level prop threading
- `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsContent.tsx` — tab router
- `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIntegrationsTab.tsx` — the tab: project picker, filters, grid, save handlers
- `.../WorkspaceSettingsIntegrationCard.tsx` — one grid card
- `.../WorkspaceSettingsIntegrationDetailModal.tsx` — the detail modal (webhook URL, options, connect button)
- `.../WorkspaceSettingsIntegrationPreview.tsx` — the modal's mock activity feed
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
- `app/Services/RoleService.php` — default grants per tier
- `app/Policies/ProjectPolicy.php` — `viewIntegrations`/`updateIntegrations`
- `app/Http/Controllers/SettingsController.php` — computes the UI-facing booleans
- `app/Http/Controllers/ProjectIntegrationController.php` — authorizes + validates mutations
- `routes/web.php` — `projects.integrations.update` / `projects.integrations.settings.update`

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
   jeśli dodałeś uprawnienie (zobacz przewodnik 2, krok 6 — to jest
   przyczyna numer jeden problemu "dlaczego moja nowa rzecz się nie pojawia").
2. Upewnij się, że faktycznie działa worker kolejki —
   `php artisan queue:work` (albo jest już częścią `composer dev`) —
   inaczej `SendWebhookNotificationJob` będzie tkwić zakolejkowane
   w nieskończoność i nic nie dotrze do Discorda, mimo że wszystko
   inne zadziałało.
3. Użyj prawdziwego (albo jednorazowego) URL-a webhooka Discorda,
   żeby zobaczyć, jak faktyczna wiadomość dociera —
   `https://discord.com/api/webhooks/<id>/<token>`, stworzonego
   w ustawieniach Integrations → Webhooks serwera Discorda.
