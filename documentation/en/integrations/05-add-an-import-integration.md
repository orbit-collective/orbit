# Add an import integration

Worked example: turning **Linear** from a locked "coming soon" catalog
card into a fully working *import* integration, the same way Jira
works today. This is the **inbound/pull** counterpart to guide 1
(outbound/notify webhook integrations like Discord/Slack) — a
completely separate axis with its own contract, registry, and
settings-panel shape. Read guide 1's intro if you haven't, so the
distinction is clear before you start:

- **Notify integrations** (Discord, Slack, ...) react to a domain
  event (`IssueCreated`, `CommentAdded`, ...) and push a message out
  via a webhook. One `IntegrationNotifier` per integration, resolved by
  `IntegrationNotifierRegistry`, invoked by
  `NotifyProjectIntegrationsListener`.
- **Import integrations** (Jira today; Linear, Asana, Trello are
  catalog-only stubs) pull issues/epics/subtasks *in* from a remote
  system on a user's request (a "Connect" + "Import" flow), converting
  the remote system's statuses/priorities/labels/hierarchy into Orbit's
  own fixed model. One `IntegrationImporter` per integration, resolved
  by `IntegrationImporterRegistry`, invoked by a controller action that
  dispatches a queued job — there's no domain event to react to, since
  nothing happened in Orbit yet.

Linear already has a catalog entry (`kind: 'import'`, `comingSoon:
true`, no `importConfig`) and sub-options describing import/sync
behavior, so this guide covers both "the catalog entry already exists,
just give it an `importConfig` and wire the backend" (every step below)
and, in an aside at the end of Step 1, what to do if you're starting
with no catalog entry at all.

## The one rule that matters most

**Never add per-integration schema.** `project_integrations.credentials`
(opaque encrypted JSON), `external_issue_links` (dedup/tracking), and
`integration_field_mappings` (status/priority/label mapping) are
already generic across every importer. If you find yourself reaching
for a `linear_issue_links` table or a `linear_field_mappings` table,
stop — you're duplicating something that already exists. Adding Linear
should touch **zero new migrations**. The only genuinely new code is
"how do I talk to Linear's API" and "how do I map Linear's JSON into
`ExternalIssueDTO`" — everything past that boundary
(`ImportOrchestratorService`, hierarchy resolution via `Issue::parent_id`,
dedup, field mapping) is already built and already tested against
Jira's shape.

## Step 1 — Add the catalog entry's `importConfig`

File: `resources/js/types/Integrations.ts`

Linear's catalog entry already exists with `kind: 'import'` but no
`importConfig` (only Jira has one populated so far). Give it one,
following the exact shape Jira uses:

```ts
{
    id: 'linear',
    name: 'Linear',
    vendor: 'By Linear Orbit, Inc.',
    category: 'Productivity',
    brand: 'linear',
    accentClassName: 'bg-[#5E6AD2]/15',
    websiteUrl: 'https://linear.app',
    description: 'Import and sync issues between Orbit and Linear.',
    overview:
        'Connect Linear to import existing issues or keep two teams working across both tools in sync, without losing history on either side.\n\n**What you get:**\n- One-time or ongoing issue import from Linear\n- Two-way status sync for linked issues\n- Cycle and priority mapping',
    previewSamples: [
        {
            title: '12 issues imported from Linear team "Core"',
            time: 'Just now',
        },
        {
            title: 'Status synced from Linear for issue #142',
            time: '18m ago',
        },
    ],
    subOptions: [
        {
            id: 'issue-import',
            title: 'Issue import',
            description: 'Import existing Linear issues into a project.',
        },
        {
            id: 'status-sync',
            title: 'Status sync',
            description: 'Keep issue status in sync in both directions.',
        },
    ],
    kind: 'import',
    importConfig: {
        credentialFields: [
            {
                id: 'api_key',
                label: 'Linear API key',
                type: 'password',
            },
        ],
        mappingTypes: ['status', 'priority', 'label'],
    },
    comingSoon: true, // <- flip this in the last step, once wired end to end
},
```

Notes:
- `importConfig.credentialFields[].id` becomes a key inside
  `project_integrations.credentials` (see Step 5) — Linear only needs
  one field (a personal API key, unlike Jira's three), and
  `WorkspaceSettingsImportPanel.tsx` renders however many fields you
  list here with no further frontend changes.
- `importConfig.mappingTypes` controls which of the panel's mapping
  tables render. Only `status` and `priority` actually show a table
  today, because those are the two kinds of remote metadata
  `IntegrationImporter::fetchMappingMetadata()` can enumerate up front
  (see Step 3) — `label` mappings apply automatically at import time
  (an unmapped remote label/component is simply omitted, since Orbit's
  `IssueLabel` enum is a small fixed set), there's no pre-import UI for
  them yet.
- Existing `subOptions` (`issue-import`, `status-sync`) are cosmetic
  copy only for `kind: 'import'` entries right now — they aren't read
  by any backend code (unlike a `kind: 'notify'` integration's
  `subOptions`, which map 1:1 to `ProjectIntegration.options` keys).

If you were starting with **no catalog entry at all**: add the new
`IntegrationId` union member, a `BrandIcon` case (see guide 1 Step 1),
and this whole object with `kind: 'import'` from scratch.

## Step 2 — Write the API client

New file: `app/Services/Integrations/Linear/LinearApiClient.php`

A thin wrapper around the remote system's HTTP API — nothing here
knows about Orbit's domain model. Build yours to the same shape as the
real, complete reference below (this is the actual code in the repo
today, not a template — read it, then adapt it, don't copy its `Jira`
namespace/class name):

Reference: `app/Services/Integrations/Jira/JiraApiClient.php`

```php
<?php

namespace App\Services\Integrations\Jira;

use App\Models\ProjectIntegration;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Thin Jira Cloud REST API (v3) wrapper, Basic Auth (email + API token) per
 * ProjectIntegration::credentials. Never logs the credentials themselves or
 * a raw response body (which may carry sensitive issue content) — only the
 * request path and response status, mirroring SendWebhookNotificationJob's
 * secret-redaction convention.
 */
class JiraApiClient
{
    public function testConnection(ProjectIntegration $projectIntegration): bool
    {
        try {
            return $this->client($projectIntegration)->get('/rest/api/3/myself')->successful();
        } catch (ConnectionException) {
            return false;
        }
    }

    public function getIssueTypes(ProjectIntegration $projectIntegration): array
    {
        return $this->getJson($projectIntegration, '/rest/api/3/issuetype');
    }

    public function getStatuses(ProjectIntegration $projectIntegration): array
    {
        return $this->getJson($projectIntegration, '/rest/api/3/status');
    }

    public function getPriorities(ProjectIntegration $projectIntegration): array
    {
        return $this->getJson($projectIntegration, '/rest/api/3/priority');
    }

    /**
     * One page of a JQL search via /rest/api/3/search/jql — the endpoint
     * that replaced the deprecated GET/POST /rest/api/3/search (which now
     * returns HTTP 410 Gone on every Jira Cloud site). That old endpoint's
     * offset pagination (startAt/total) is gone too: this one is cursor-based
     * — pass back whatever "nextPageToken" the previous page returned, and
     * there is no next page once the response omits that key entirely.
     * Expands each issue's parent link so the caller (JiraIntegrationImporter)
     * can resolve epic/subtask hierarchy.
     */
    public function searchIssues(ProjectIntegration $projectIntegration, string $jql, ?string $nextPageToken = null, int $maxResults = 50): array
    {
        $query = [
            'jql' => $jql,
            'maxResults' => $maxResults,
            'fields' => 'summary,description,status,priority,issuetype,parent,labels,components,assignee,duedate',
        ];

        if ($nextPageToken !== null) {
            $query['nextPageToken'] = $nextPageToken;
        }

        return $this->getJson($projectIntegration, '/rest/api/3/search/jql', $query);
    }

    private function getJson(ProjectIntegration $projectIntegration, string $path, array $query = []): array
    {
        try {
            $response = $this->client($projectIntegration)->get($path, $query);
        } catch (ConnectionException) {
            Log::warning('Jira API request failed to connect', ['path' => $path]);

            throw new RuntimeException("Jira API request failed to connect: $path");
        }

        if ($response->failed()) {
            Log::warning('Jira API request failed', [
                'path' => $path,
                'status' => $response->status(),
            ]);

            $response->throw();
        }

        return $response->json();
    }

    private function client(ProjectIntegration $projectIntegration): PendingRequest
    {
        $credentials = $projectIntegration->credentials ?? [];

        return Http::baseUrl(rtrim($credentials['instance_url'] ?? '', '/'))
            ->withBasicAuth($credentials['email'] ?? '', $credentials['api_token'] ?? '')
            ->acceptJson()
            ->timeout(10);
    }
}
```

Your Linear equivalent reads `$projectIntegration->credentials['api_key']`
and sets a bearer/`Authorization` header instead of `withBasicAuth()`
(Linear's actual API is GraphQL, not REST, so `getJson()`'s shape would
become a single `query()` method posting a GraphQL document — the
important part to keep is: one `client()` builder reading credentials
off the model, every other method going through it, and every failure
path logging the path/status/query name but never the API key).

## Step 3 — Write the `IntegrationImporter`

New file: `app/Services/Integrations/Linear/LinearIntegrationImporter.php`

This is the class that translates the remote system's shape into
`ExternalIssueDTO` — the **only** place Linear's field names should
ever appear in the codebase. Build yours to the same shape as the real,
complete reference below (again, adapt the namespace/class name and
the actual field-mapping logic — don't copy Jira's field paths):

Reference: `app/Services/Integrations/Jira/JiraIntegrationImporter.php`

```php
<?php

namespace App\Services\Integrations\Jira;

use App\Contracts\IntegrationImporter;
use App\DataTransferObjects\ExternalIssueDTO;
use App\Models\ProjectIntegration;
use Generator;

/**
 * Translates Jira's REST API shape into the source-agnostic ExternalIssueDTO
 * once, here — nothing past this class knows Jira's field paths
 * (fields.issuetype.name, fields.parent.id, ADF descriptions, ...).
 */
class JiraIntegrationImporter implements IntegrationImporter
{
    private const int PAGE_SIZE = 50;

    public function __construct(protected JiraApiClient $jiraApiClient) {}

    public function testConnection(ProjectIntegration $projectIntegration): bool
    {
        return $this->jiraApiClient->testConnection($projectIntegration);
    }

    public function fetchMappingMetadata(ProjectIntegration $projectIntegration): array
    {
        return [
            'statuses' => $this->toMetadataOptions($this->jiraApiClient->getStatuses($projectIntegration)),
            'priorities' => $this->toMetadataOptions($this->jiraApiClient->getPriorities($projectIntegration)),
            'issueTypes' => $this->toMetadataOptions($this->jiraApiClient->getIssueTypes($projectIntegration)),
        ];
    }

    /**
     * $options['project_key'] selects the Jira project to pull from;
     * $options['jql'] can override the query entirely for callers that need
     * more control (e.g. re-importing a specific set of issues).
     *
     * @return Generator<ExternalIssueDTO>
     */
    public function fetchIssues(ProjectIntegration $projectIntegration, array $options = []): Generator
    {
        $jql = $options['jql'] ?? 'project = "'.($options['project_key'] ?? '').'" ORDER BY key ASC';

        $nextPageToken = null;

        do {
            $page = $this->jiraApiClient->searchIssues($projectIntegration, $jql, $nextPageToken, self::PAGE_SIZE);
            $issues = $page['issues'] ?? [];

            foreach ($issues as $issue) {
                yield $this->mapIssue($projectIntegration, $issue);
            }

            $nextPageToken = $page['nextPageToken'] ?? null;
        } while ($issues !== [] && $nextPageToken !== null);
    }

    private function mapIssue(ProjectIntegration $projectIntegration, array $issue): ExternalIssueDTO
    {
        $fields = $issue['fields'] ?? [];

        $labels = array_values(array_filter([
            ...($fields['labels'] ?? []),
            ...array_map(fn (array $component) => $component['name'] ?? null, $fields['components'] ?? []),
        ]));

        $instanceUrl = rtrim($projectIntegration->credentials['instance_url'] ?? '', '/');

        return new ExternalIssueDTO(
            externalId: (string) $issue['id'],
            externalKey: $issue['key'] ?? null,
            title: $fields['summary'] ?? '(no title)',
            description: $this->adfToPlainText($fields['description'] ?? null),
            externalStatus: $fields['status']['name'] ?? null,
            externalPriority: $fields['priority']['name'] ?? null,
            externalLabels: $labels,
            type: $fields['issuetype']['name'] ?? null,
            parentExternalId: isset($fields['parent']['id']) ? (string) $fields['parent']['id'] : null,
            assigneeExternalId: $fields['assignee']['accountId'] ?? null,
            assigneeEmail: $fields['assignee']['emailAddress'] ?? null,
            endDate: $fields['duedate'] ?? null,
            url: $instanceUrl && isset($issue['key']) ? "$instanceUrl/browse/{$issue['key']}" : null,
        );
    }

    /**
     * Jira Cloud's v3 API returns `description` as Atlassian Document
     * Format (a nested JSON node tree), not plain text — this walks it and
     * concatenates every text leaf. Best-effort: formatting/marks are
     * dropped, which is an acceptable loss for an imported issue body.
     */
    private function adfToPlainText(mixed $description): ?string
    {
        if ($description === null) {
            return null;
        }

        if (is_string($description)) {
            return $description;
        }

        return $this->extractAdfText($description) ?: null;
    }

    private function extractAdfText(array $node): string
    {
        $text = $node['text'] ?? '';

        foreach ($node['content'] ?? [] as $child) {
            $text .= ($text !== '' ? "\n" : '').$this->extractAdfText($child);
        }

        return trim($text);
    }

    private function toMetadataOptions(array $items): array
    {
        return array_map(fn (array $item) => [
            'value' => $item['name'] ?? $item['id'],
            'label' => $item['name'] ?? $item['id'],
        ], $items);
    }
}
```

`fetchIssues()` being a PHP generator matters: `ImportOrchestratorService::import()`
(see the architecture note below) consumes it lazily, one issue at a
time, so a project with thousands of issues doesn't load them all into
memory before the first one gets created. Linear's GraphQL API uses its
own cursor convention rather than Jira's `nextPageToken`, but the shape
is the same: loop, `yield` each mapped DTO, stop when the API says
there's no next page.

`fetchIssues()`'s `parentExternalId` is what lets
`ImportOrchestratorService` reconstruct hierarchy generically — map it
from whatever Linear calls a parent issue/sub-issue relationship, using
the same `externalId` values (not `externalKey`) you use for
`ExternalIssueDTO::externalId` itself, since that's what
`ExternalIssueLink` dedup keys off.

## Step 4 — Register it

File: `app/Services/Integrations/IntegrationImporterRegistry.php`

```php
private const array MAP = [
    'jira' => JiraIntegrationImporter::class,
    'linear' => LinearIntegrationImporter::class,
];
```

This is the only place the import pipeline looks up which class
handles which integration key — mirrors
`IntegrationNotifierRegistry::MAP` exactly.

## Step 5 — Credentials: usually nothing to add

`project_integrations.credentials` is already a generic encrypted JSON
column (`app/Models/ProjectIntegration.php`'s `'credentials' =>
'encrypted:array'` cast) — Linear's single `api_key` just becomes
`{"api_key": "..."}` stored under it, no migration needed. Only add a
new migration if you need typed, queryable (non-JSON-blob) credential
storage, which no import integration has needed so far.

## Step 6 — Service, controller, and routes

File: `app/Services/Integrations/Linear/LinearIntegrationService.php` (new)

Mirrors `app/Services/Integrations/Jira/JiraIntegrationService.php`
method-for-method: `connect()` (save credentials, call
`testConnection()`, throw `ValidationException` on failure),
`getMappingMetadata()`, `saveMappings()`, `triggerImport()` (dispatches
a queued job — see Step 7), and `getSettingsExtras()` (the read-side
data the settings page needs, computed defensively — wrap the live
metadata call in `try`/`catch` so a Linear outage degrades the mapping
UI instead of breaking the whole settings page load).

File: `app/Http/Controllers/LinearIntegrationController.php` (new) +
`routes/web.php`:

```php
Route::post('/projects/{project}/integrations/linear/connect', [LinearIntegrationController::class, 'connect'])->name('projects.integrations.linear.connect');
Route::put('/projects/{project}/integrations/linear/mappings', [LinearIntegrationController::class, 'updateMappings'])->name('projects.integrations.linear.mappings.update');
Route::post('/projects/{project}/integrations/linear/import', [LinearIntegrationController::class, 'import'])->name('projects.integrations.linear.import');
```

Every action is gated by the same `ProjectPolicy::updateIntegrations`
check every other integration mutation route uses — nothing new to add
to the Policy.

**Architecture note — there is no `GET .../metadata` or
`GET .../import-status` route, and there shouldn't be one for Linear
either.** Orbit has no separate JSON API (see the top of the root
`CLAUDE.md`) — every page is server-rendered Inertia props. The
Jira mapping metadata, saved field mappings, and last-import summary
all flow as an ordinary Inertia prop instead: `SettingsController::index()`
computes a `jiraSettings` prop via `JiraIntegrationService::getSettingsExtras()`,
gated by `canUpdateIntegrations` exactly like the existing `webhookUrl`
masking Discord uses. Adding Linear means either generalizing that
single `jiraSettings` prop into a per-integration map (e.g.
`importIntegrationSettings: Record<string, ImportIntegrationSettings>`,
keyed by integration id) or adding a second sibling prop the same way —
the current code only supports one import integration's settings at a
time, and that's a known, deliberate simplification (see the frontend
prop-drilling chain in Step 8) rather than an oversight to silently
work around.

Finally, add `'linear'` to
`app/Services/ProjectIntegrationService.php::AVAILABLE_INTEGRATIONS`
(`['discord', 'jira', 'linear']`) — the same constant guide 1 uses for
notify integrations. Direction (`notify` vs `import`) is expressed by
which registry claims the key (`IntegrationNotifierRegistry` vs
`IntegrationImporterRegistry`), not by anything in this constant or in
`ProjectIntegration`'s schema.

## Step 7 — The import job

File: `app/Jobs/ImportLinearIssuesJob.php` (new)

Mirrors `app/Jobs/ImportJiraIssuesJob.php`: `ShouldQueue`, `tries = 3`,
`backoff()` returning `[5, 15, 30]` — the same retry shape
`SendWebhookNotificationJob` uses. Its `handle()` resolves the importer
via `IntegrationImporterRegistry`, streams `fetchIssues()` into
`ImportOrchestratorService::import()`, and persists the resulting
`ImportResultDTO` into `project_integrations.options['last_import']`
(`imported`/`updated`/`skipped`/`failed`/`errors`/`ran_at`) via
`ProjectIntegrationRepository::updateOrCreate()`.

`import()` takes a `bool $syncExisting` flag (read from
`$this->importOptions['sync_existing'] ?? false` — the same generic
options bag `fetchIssues()` already reads `project_key`/`jql` from, so
`ImportLinearIssuesJob` needs no new constructor property for it).
`false` (the default) is the original behavior: an issue already
tracked in `ExternalIssueLink` is left alone and counted as `skipped`.
`true` overwrites it instead, via `IssueService::syncImportedIssue()` —
**the remote system always wins on conflict**, with no merge against
whatever a user changed locally in Orbit since the last sync. That
overwrite reuses the exact same `mapIssueData()`/field-mapping/hierarchy
logic that creates a brand-new issue, so Linear's sync behavior is
correct automatically, not something `ImportLinearIssuesJob` has to
implement. `syncImportedIssue()` writes one `ActivityLog` entry per
changed issue (so its history stays legible, same as a normal edit) but
deliberately does **not** fire `IssueUpdated` or notify anyone — same
bulk-operation reasoning as `importIssue()` not firing `IssueCreated`: a
re-sync can touch hundreds of issues in one run.

Telling the importing user how it went is **not** this job's job.
`ImportOrchestratorService::import()` itself fires `App\Events\IssuesImported`
(project, importedBy, `ImportResultDTO`) once, unconditionally, at the
end of every run — the same "fire the fact, let the listener decide
who cares" rule every other event in this app follows (see
[`03-add-a-new-event-type.md`](./03-add-a-new-event-type.md)).
`SendNotificationListener::handleIssuesImported()` is registered for it
in `AppServiceProvider::boot()` and calls `NotificationService::notify()`
with `NotificationType::IntegrationActivity` — which is why Linear's
import gets an in-app + email "your import finished" notification for
free, with zero new code in `ImportLinearIssuesJob` itself: the event
comes from the shared orchestrator, not from the job. The one thing a
job-level `failed()` hook (called once every retry is exhausted) still
needs to do directly — via `app(NotificationService::class)->notify(...)`,
not another event — is tell the user their import never completed at
all, since `ImportOrchestratorService::import()` never got to run and
therefore never fired `IssuesImported`.

### Live progress, for a "N imported so far" toast

`ImportOrchestratorService::import()` takes an optional `?callable
$onProgress` parameter, called after every processed issue with the
running totals (`imported`/`updated`/`skipped`/`failed`). The
orchestrator itself doesn't persist or display anything — it's purely a
callback hook, so a future importer's job wires it however it needs
to. `ImportJiraIssuesJob` wires a closure that writes
`project_integrations.options['import_progress']` (throttled to every
~3rd processed issue, but never skipping the very first, so the UI
shows movement quickly), tagged with a fresh `run_id` (a UUID, not a
timestamp — sidesteps clock precision concerns) generated once per
`handle()` attempt. `JiraIntegrationService::getImportProgress()`
reads that back as a **separate, cheap** prop (`jiraImportProgress`,
wired in `SettingsController::index()`) — deliberately not folded into
`getSettingsExtras()`/`jiraSettings`, which also calls Jira's live API
for mapping metadata; polling that every ~1.5s while an import runs
would hammer Jira for no reason.

`WorkspaceSettingsIntegrationsTab.tsx` is what actually turns this into
a live toast: on triggering an import it opens a **persistent** alert
(`AlertContext::addAlert(msg, type, 0)` — `duration: 0` means "don't
auto-dismiss"), remembers the `runId` that was already in
`jiraImportProgress` *before* the click (so a poll that still returns
the *previous* run's stale `done`/`failed` record — the job hasn't
picked up the new one yet — is correctly ignored instead of closing
the toast prematurely), and polls `router.reload({ only:
['jiraImportProgress', 'flash'] })` on an interval. `'flash'` has to
be in that list too: a prop a partial reload doesn't request is never
re-evaluated client-side, so leaving it out would freeze whatever flash
message happened to be showing right before polling started, and
`AlertContext`'s global `router.on('success', ...)` handler re-shows
*whatever* is in `flash` on every completed visit (by design — see
`AlertContext.tsx`'s own comment on why it can't dedupe by content) —
including these background polls. `AlertContext::updateAlert(id,
patch)` is what lets the same toast's text change in place as new
progress comes in, and `App\Events\IssuesImported` (above) is what
eventually tells the poller to stop and swap in a final summary toast.
None of this frontend wiring is Jira-specific — Linear's import gets a
live toast for free the moment its own job wires the same `onProgress`
callback.

One thing **not** to copy reflexively: `ImportJiraIssuesJob` does
**not** implement `ShouldBeEncrypted`, unlike `SendWebhookNotificationJob`.
That's because its constructor takes `ProjectIntegration`/`Project`
model instances, which Laravel's `SerializesModels` trait serializes as
a class+id reference, not raw attributes — the credential-bearing
`credentials` column never enters the queue payload at all, it's only
decrypted when the model is re-fetched inside `handle()`. Only reach
for `ShouldBeEncrypted` if a future importer's job takes a raw secret
string directly as a constructor argument (the way
`SendWebhookNotificationJob` takes `$webhookUrl`).

`triggerImport()` (Step 6) dispatches it: `ImportLinearIssuesJob::dispatch($projectIntegration,
$project, $importedBy->id, $importOptions)`. A running queue worker
is required for anything to actually happen — see `composer dev`'s
`queue:listen` process.

## Step 8 — Frontend wiring

File: `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIntegrationsTab.tsx`

Add an entry to `IMPORT_ROUTE_NAMES`:

```ts
const IMPORT_ROUTE_NAMES: Partial<
    Record<IntegrationId, { connect: string; mappings: string; import: string }>
> = {
    jira: {
        connect: 'projects.integrations.jira.connect',
        mappings: 'projects.integrations.jira.mappings.update',
        import: 'projects.integrations.jira.import',
    },
    linear: {
        connect: 'projects.integrations.linear.connect',
        mappings: 'projects.integrations.linear.mappings.update',
        import: 'projects.integrations.linear.import',
    },
};
```

That's the **entire** frontend change needed for the connect/mapping/
import flow itself — `WorkspaceSettingsImportPanel.tsx` already renders
whatever `importConfig` (Step 1) describes, and
`WorkspaceSettingsIntegrationDetailModal.tsx` already routes any
`kind: 'import'` integration to that panel. Nothing about either file
is Jira-specific — that includes the "Update already-imported issues"
toggle next to the Import button, which posts `sync_existing` to
whichever route `IMPORT_ROUTE_NAMES` resolves to. Linear gets it for
free the moment the entry above exists; there's nothing importer-specific
to add for it on the frontend.

What you do still need to touch, per the Step 6 architecture note: the
`jiraSettings` prop threaded through `SettingsController` →
`Settings/Index.tsx` → `WorkspaceSettingsContent.tsx` →
`WorkspaceSettingsIntegrationsTab.tsx` → the modal → the panel is
currently singular and Jira-specific. Generalize it (a per-integration
map, or a second identically-shaped prop) before Linear's settings can
render alongside Jira's — don't silently reuse the `jiraSettings` prop
for Linear's data.

Finally, flip `comingSoon: false` on Linear's catalog entry (Step 1)
once everything above is wired and manually verified — this one flag
unlocks the toggle/Connect UI exactly as described in guide 1 Step 7.

## Tests

Every Pest feature test in this codebase lives flat under `tests/Feature/`
(named after the class under test, not nested by namespace — see any
existing `*Test.php` there) — mirror that when you add Linear's, not
the nested-by-namespace shape you might expect. What exists today for
the shared pipeline, exercised entirely through Jira but equally valid
for any future source:

- `tests/Feature/ImportOrchestratorServiceTest.php` — imports a new
  issue and links it; skips an already-linked issue by default; with
  `syncExisting: true` overwrites it instead (remote data wins even
  over a locally-changed field); resolves `parent_id` both when a child
  arrives before its parent in the same run *and* when the parent was
  imported in a previous run; counts a per-issue failure (forced via
  the issues table's date-order trigger) without aborting the rest of
  the run; asserts `IssuesImported` fires exactly once with the final
  result (`Event::fake()` + `Event::assertDispatchedTimes()`); and
  asserts `onProgress` is called with the running totals after every
  processed issue.
- `tests/Feature/ImportJiraIssuesJobTest.php` — `handle()` imports
  issues and leaves `import_progress` as `{status: 'done', ...}` with a
  non-empty `run_id`; persists a matching `last_import` summary;
  threads `sync_existing` through to the orchestrator (verified by a
  second run actually overwriting an issue); no-ops with a log warning
  when the integration has no registered importer; and `failed()`
  records `{status: 'failed'}` and notifies the importing user. Uses
  `Http::fake(['*/rest/api/3/search/jql*' => Http::sequence()->push(...)->push(...)])`
  for the two-run sync test — a second, separate `Http::fake()` call in
  the same test does **not** replace the first registration for an
  overlapping URL pattern (the earliest-registered stub wins), so both
  pages have to be queued up front in one call.
- `tests/Feature/SendNotificationListenerTest.php` — two `IssuesImported`
  cases alongside the existing `ProjectInvited`/`IssueAssigned`/etc.
  ones: `'success'` severity when nothing failed, `'warning'` when
  `failed > 0`.
- Vitest: `WorkspaceSettingsIntegrationsTab.test.tsx`'s "Jira import
  live progress toast" `describe` block — the persistent toast appears
  immediately and only starts polling `jiraImportProgress` + `flash`
  after the poll interval elapses (`await waitFor(...)`, not fake
  timers — those don't play well with `userEvent`'s own internal
  timing); a `running` update changes the toast's text in place; a
  `done`/`failed` update replaces it with a final summary (asserted via
  `waitFor`, since the outgoing toast stays in the DOM mid-`framer-motion`
  exit transition — a synchronous `not.toBeInTheDocument()` check right
  after the state change is a common false negative here); and a poll
  that still returns the *previous* run's leftover `runId` is ignored
  rather than closing the toast early.

Still to add when you build Linear's importer (add both at once rather
than compounding the gap):
`tests/Unit/ExternalIssueDTOTest.php` (construction/shape),
`tests/Feature/FieldMappingResolverServiceTest.php` (saved mapping
wins, falls back to the per-type default when unmapped),
`tests/Feature/JiraApiClientTest.php` / `LinearApiClientTest.php` (via
`Http::fake()`, request shape + credential redaction in thrown
exceptions/logs), and
`tests/Feature/JiraIntegrationControllerTest.php` /
`LinearIntegrationControllerTest.php` (policy gating on every route,
mirroring `ProjectIntegrationControllerTest.php`).

Run `php artisan test` and `npm test -- run` before committing — see
the root `CLAUDE.md` for the exact commands.
