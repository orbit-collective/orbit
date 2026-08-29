# Add integration settings

`project_integrations` currently stores, per project+integration pair:

| column | type | purpose |
|---|---|---|
| `enabled` | boolean | the card's toggle switch |
| `webhook_url` | text, **encrypted** (Laravel `encrypted` cast) | where to POST activity |
| `options` | json | boolean sub-option toggles, e.g. `{"issue-activity": true}` |

This guide covers the two ways you'll actually extend this: **(A)**
adding a new boolean sub-option to an existing integration (the common
case — e.g. Discord growing a third toggle), and **(B)** adding a
brand-new *typed* field beyond `enabled`/`webhook_url` (e.g. a Slack
channel name, or an API key for an integration that isn't
webhook-based at all).

## Part A — add a new boolean sub-option to an existing integration

Worked example: adding a `"milestone-activity"` sub-option to Discord
(posting when a project milestone is hit — a fact your event system
doesn't have yet; see guide 3 for creating the event itself first).
Once the event exists, wiring the toggle is four small edits.

### A1 — add the sub-option to the frontend catalog

File: `resources/js/types/Integrations.ts`, in Discord's entry:

```ts
subOptions: [
    { id: 'issue-activity', title: 'Issue activity', description: '...' },
    { id: 'comment-activity', title: 'Comment activity', description: '...' },
    {
        id: 'milestone-activity',
        title: 'Milestone activity',
        description: 'Post a message when a project milestone is reached.',
    },
],
```

The modal (`WorkspaceSettingsIntegrationDetailModal.tsx`) renders one
`ToggleSwitch` row per entry in this array automatically — nothing
else on the frontend needs to change for the toggle itself to appear,
save, and reflect its stored state. (It reads/writes
`settings.options[option.id]` generically, keyed by whatever `id`
strings are in this array.)

### A2 — whitelist the new key on the backend

File: `app/Services/ProjectIntegrationService.php`

```php
private const array AVAILABLE_OPTIONS = [
    'discord' => ['issue-activity', 'comment-activity', 'milestone-activity'],
];
```

This is the **only** backend change needed for the setting to be
save-able at all — `updateSettings()` silently drops any option key not
in this list (`array_intersect_key`), so skipping this step means the
toggle appears in the UI, "saves" successfully (no error), but the
value never actually persists. If a toggle looks like it's not
sticking, check this list first.

### A3 — map the new category in the integrations listener

File: `app/Listeners/NotifyProjectIntegrationsListener.php`,
`resolveContext()`:

```php
private function resolveContext(object $event): array
{
    return match (true) {
        $event instanceof IssueAssigned,
        $event instanceof IssueUnassigned,
        $event instanceof IssueUpdated => [$event->issue->project, 'issue-activity'],
        $event instanceof CommentAdded => [$event->issue->project, 'comment-activity'],
        $event instanceof MilestoneReached => [$event->project, 'milestone-activity'], // new
        default => [null, null],
    };
}
```

(`MilestoneReached` doesn't exist yet in this codebase — see guide 3
for creating a new event class and firing it from the right service.)
Also add the event's class to the `Event::listen([...],
NotifyProjectIntegrationsListener::class)` array in
`app/Providers/AppServiceProvider.php`, or the listener never runs for
it at all.

### A4 — handle the new event in the notifier

File: `app/Services/Integrations/DiscordIntegrationNotifier.php` — add
a `match` branch and an embed-builder method (see guide 3, step 5, for
the full worked example using `IssueCreated`).

### A5 — tests

- `tests/Feature/ProjectIntegrationServiceTest.php` — extend the "it
  only persists known option keys" test's assertion, or add a sibling
  test, to cover `milestone-activity` being accepted now.
- `tests/Feature/NotifyProjectIntegrationsListenerTest.php` — add a
  case asserting `MilestoneReached` routes to the
  `milestone-activity` option independently of the other two.
- `tests/Feature/DiscordIntegrationNotifierTest.php` — a new embed
  test for the new event kind.

## Part B — add a brand-new typed field (not a boolean option)

Worked example: a hypothetical Slack-specific `channel_name` field (a
plain string, shown alongside the webhook URL) — the same shape applies
to an encrypted `api_key` for a non-webhook integration.

### B1 — migration

New file: `database/migrations/YYYY_MM_DD_HHMMSS_add_channel_name_to_project_integrations_table.php`
(always a **new, additive** migration — never edit
`2026_08_25_120000_create_project_integrations_table.php` or
`..._add_webhook_url_and_options_to_project_integrations_table.php`
after they've been committed/deployed):

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_integrations', function (Blueprint $table) {
            $table->string('channel_name')->nullable()->after('webhook_url');
        });
    }

    public function down(): void
    {
        Schema::table('project_integrations', function (Blueprint $table) {
            $table->dropColumn('channel_name');
        });
    }
};
```

If the new field is a secret (an API key, a bot token — anything that
grants access on its own), give it the same treatment as
`webhook_url`: add it to `$casts` in the model as `'encrypted'`. A
plain display value like a channel *name* (not a token) doesn't need
encryption.

### B2 — model

File: `app/Models/ProjectIntegration.php`

```php
protected $fillable = [
    'project_id',
    'integration',
    'enabled',
    'webhook_url',
    'options',
    'channel_name', // new
];

protected $casts = [
    'enabled' => 'boolean',
    'webhook_url' => 'encrypted',
    'options' => 'array',
    // channel_name needs no cast — it's a plain string
];
```

### B3 — service

File: `app/Services/ProjectIntegrationService.php`

Extend `getSettings()` to include the field, and `updateSettings()` to
accept and persist it — following the exact `array_key_exists` +
"only touch what was actually sent" pattern already used for
`webhook_url`/`options` (this is what makes the endpoint behave like a
real `PATCH`: sending `{options: {...}}` alone never clobbers an
already-saved `channel_name`, and vice versa):

```php
public function getSettings(Project $project): array
{
    $settings = [];

    foreach (self::AVAILABLE_INTEGRATIONS as $integration) {
        $record = $this->projectIntegrationRepository->findForProject($project, $integration);

        $settings[$integration] = [
            'enabled' => $record?->enabled ?? false,
            'webhookUrl' => $record?->webhook_url,
            'channelName' => $record?->channel_name, // new
            'options' => array_merge(
                array_fill_keys(self::AVAILABLE_OPTIONS[$integration] ?? [], false),
                $record?->options ?? [],
            ),
        ];
    }

    return $settings;
}

public function updateSettings(Project $project, string $integration, array $data): ProjectIntegration
{
    $this->assertAvailable($integration);

    $attributes = [];

    if (array_key_exists('webhook_url', $data)) {
        $attributes['webhook_url'] = $this->validateWebhookUrl($integration, $data['webhook_url']);
    }

    if (array_key_exists('channel_name', $data)) {
        $attributes['channel_name'] = $data['channel_name'] !== '' ? $data['channel_name'] : null;
    }

    if (array_key_exists('options', $data)) {
        // ... unchanged, see the existing method ...
    }

    $record = $this->projectIntegrationRepository->updateOrCreate($project, $integration, $attributes);

    $this->activityLogService->log($project->id, "Updated settings for the \"$integration\" integration");

    return $record;
}
```

If the new field only makes sense for *some* integrations (like
`channel_name` only mattering for Slack), don't bother validating
"is this integration allowed to have a channel name" server-side
unless there's an actual security/data-integrity reason to — an unused
column being `null` for Discord's row is harmless. Do add that kind of
guard (mirroring `AVAILABLE_OPTIONS`) if the field is something
sensitive or integration-specific enough that storing it for the wrong
integration would be a real bug, not just clutter.

### B4 — controller validation

File: `app/Http/Controllers/ProjectIntegrationController.php`,
`updateSettings()`:

```php
$validated = $request->validate([
    'webhook_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
    'channel_name' => ['sometimes', 'nullable', 'string', 'max:80'], // new
    'options' => ['sometimes', 'array'],
    'options.*' => ['boolean'],
]);
```

### B5 — controller masking (only if the field is a secret)

File: `app/Http/Controllers/SettingsController.php`,
`mapIntegrationSettings()` — mirror the `webhookUrl` masking (only the
decrypted value reaches a viewer who can actually update it; everyone
else gets a boolean "is one configured" flag) if the new field is
sensitive:

```php
private function mapIntegrationSettings(array $settings, bool $canUpdateIntegrations): array
{
    return array_map(fn (array $integration) => [
        'enabled' => $integration['enabled'],
        'hasWebhookUrl' => $integration['webhookUrl'] !== null,
        'webhookUrl' => $canUpdateIntegrations ? $integration['webhookUrl'] : null,
        'channelName' => $integration['channelName'], // new — plain string, not a secret, so no masking needed
        'options' => $integration['options'],
    ], $settings);
}
```

### B6 — frontend type + UI

File: `resources/js/types/ProjectIntegrations.ts`

```ts
export interface ProjectIntegrationSettings {
    enabled: boolean;
    hasWebhookUrl: boolean;
    webhookUrl: string | null;
    channelName: string | null; // new
    options: Record<string, boolean>;
}
```

File: `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIntegrationDetailModal.tsx`
— add local draft state and a field, following the exact pattern
`webhookUrlDraft` already uses (sync via `useEffect` keyed on
`integration?.id`, a controlled `Input`, a `Save` button disabled while
unchanged):

```tsx
const [channelNameDraft, setChannelNameDraft] = useState(
    settings?.channelName ?? '',
);

useEffect(() => {
    setChannelNameDraft(settings?.channelName ?? '');
}, [integration?.id, settings?.channelName]);

// ...inside the "Configuration" section, alongside the webhook URL field:
<Input
    id="integration-channel-name"
    variant="modal"
    value={channelNameDraft}
    onChange={(event) => setChannelNameDraft(event.target.value)}
    placeholder="#general"
/>
<button
    type="button"
    disabled={channelNameDraft === (settings?.channelName ?? '')}
    onClick={() => onSaveChannelName(channelNameDraft)}
>
    Save
</button>
```

Add the matching `onSaveChannelName: (channelName: string) => void`
prop, and in `WorkspaceSettingsIntegrationsTab.tsx` wire it to the same
`saveIntegrationSettings()` helper the webhook URL save button already
uses, just with a different payload key:

```tsx
onSaveChannelName={(channelName) => {
    if (!openIntegration) return;
    saveIntegrationSettings(openIntegration.id, { channel_name: channelName });
}}
```

### B7 — tests

- `tests/Feature/ProjectIntegrationServiceTest.php` — a "it can save a
  channel name" test and an "it does not clobber the webhook url when
  only channel_name is sent" test (this is the one that actually
  proves the partial-update behavior works).
- `tests/Feature/ProjectIntegrationControllerTest.php` — a request
  validation test if you added format rules (e.g. max length).
- `tests/Feature/SettingsControllerTest.php` — only if you added
  masking (B5); assert the field is/isn't exposed the same way the
  `webhookUrl` tests do.
- `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIntegrationDetailModal.test.tsx`
  — a "lets an editor type and save a channel name" test mirroring the
  existing webhook URL one.
