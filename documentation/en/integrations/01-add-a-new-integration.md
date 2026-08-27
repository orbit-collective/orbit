# Add a new integration

Worked example: turning **Slack** from a locked "coming soon" catalog
card into a fully working integration, exactly the way Discord works
today. Slack already has a brand icon and a catalog entry (with
`comingSoon: true`), so this guide covers both "the catalog entry
already exists, just make it real" (steps 1, 4–8) and "there's no
catalog entry yet at all" (steps 2–3, which you'd skip if — like
Slack — it's already there).

If you're wiring up a completely new integration with no catalog entry
and no brand icon at all, do every step in order. If the integration is
already in the catalog as `comingSoon: true` (true for everything
except Discord right now), skip straight to step 4.

## Step 1 — Confirm/add the brand icon

File: `resources/js/Components/Atoms/BrandIcon/BrandIcon.tsx`

Every icon is inlined official SVG path data (sourced from
[Simple Icons](https://simpleicons.org), CC0-licensed — **not**
hand-drawn; svgrepo.com is Cloudflare-protected and can't be scraped
from this environment, so pull real path data from
`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/<slug>.svg`
instead). Slack already has an entry:

```tsx
case 'slack':
    return (
        <svg
            role="img"
            viewBox="0 0 24 24"
            className={className}
            fill="#4A154B"
        >
            <title>Slack</title>
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
        </svg>
    );
```

If you were adding one from scratch, add the new name to the
`BrandIconName` union at the top of the file and a new `case` in the
`switch`, following the exact same shape: `role="img"`, `viewBox="0 0
24 24"`, a `<title>`, and `fill` set to either the brand's official hex
(look it up in
`https://raw.githubusercontent.com/simple-icons/simple-icons/develop/data/simple-icons.json`)
or `currentColor` for a brand whose mark is naturally
monochrome/black-on-white (GitHub, Notion, CircleCI do this — pair it
with `accentClassName: 'bg-white/10'` in the catalog entry below so it
stays visible on the dark theme).

Add a matching case to `resources/js/Components/Atoms/BrandIcon/BrandIcon.test.tsx`'s
`names` array so `test.each` covers it.

## Step 2 — Add/confirm the catalog entry

File: `resources/js/types/Integrations.ts`

```ts
{
    id: 'slack',
    name: 'Slack',
    vendor: 'By Slack Technologies',
    category: 'Communication', // one of INTEGRATION_CATEGORIES
    brand: 'slack',             // must match a BrandIconName case
    accentClassName: 'bg-[#4A154B]/15', // brand hex at 15% opacity for the icon chip
    websiteUrl: 'https://slack.com',
    description:
        'Send notifications and updates directly to your team channels.',
    overview:
        'Connect Slack to route Orbit notifications into the right channels, so teams can react to project activity without leaving their existing workflow.\n\n**What you get:**\n- Channel-level routing per project\n- Threaded replies that stay in sync with Orbit comments\n- A slash command to create an issue without leaving Slack',
    previewSamples: [
        { title: 'Issue #128 assigned to Jane Cooper', time: 'Just now' },
        { title: 'New comment on "Fix login crash"', time: '2m ago' },
    ],
    subOptions: [
        {
            id: 'issue-activity',
            title: 'Issue activity',
            description:
                'Post a message when an issue is created, assigned, or resolved.',
        },
        {
            id: 'comment-activity',
            title: 'Comment activity',
            description: 'Post a message whenever someone leaves a comment.',
        },
    ],
    comingSoon: true, // <- this is the only thing step 4 changes
},
```

Notes on each field:
- `overview` is rendered as **markdown** (via `EditableMarkdown` in
  disabled mode — see guide 5) — use `\n\n` for paragraph breaks and
  `**bold**`/`- list` markdown syntax, not HTML.
- `subOptions[].id` **must exactly match** the string keys you'll use
  on the backend (`issue-activity`, `comment-activity`, or new ones —
  see guide 3). These ids flow, unmodified, from the frontend UI all
  the way to `ProjectIntegration.options` in the database and to
  `NotifyProjectIntegrationsListener`'s category matching. Get the
  spelling right in both places or a toggle will silently do nothing.
- `previewSamples` are two fake activity lines shown in the modal's
  preview block (`WorkspaceSettingsIntegrationPreview`) — purely
  cosmetic, not read by any backend code.

## Step 3 — (only if brand-new) add a Pest/Vitest smoke test for the catalog data

There's no dedicated test file for `INTEGRATIONS` itself (it's covered
indirectly by every component test that renders from it), so nothing
to add here beyond what step 1 already covered for the icon.

## Step 4 — Make it available on the backend

File: `app/Services/ProjectIntegrationService.php`

Add the integration's id to **two** class constants:

```php
public const array AVAILABLE_INTEGRATIONS = ['discord', 'slack'];

private const array AVAILABLE_OPTIONS = [
    'discord' => ['issue-activity', 'comment-activity'],
    'slack' => ['issue-activity', 'comment-activity'],
];
```

If the integration takes a webhook URL and you want format validation
(recommended — catches copy-paste mistakes early), add a regex too:

```php
private const array WEBHOOK_URL_PATTERNS = [
    'discord' => '/^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/',
    'slack' => '/^https:\/\/hooks\.slack\.com\/services\/T[0-9A-Z]+\/B[0-9A-Z]+\/[0-9A-Za-z]+$/',
];
```

If the pattern is omitted for an integration, `updateSettings()` just
skips format validation for it (still stores whatever string was
given) — only add a pattern once you actually know the integration's
real webhook URL shape.

That's the entire change needed for the "is this integration allowed,
can it store settings" layer — `getSettings()`/`getStatuses()` derive
everything else from `AVAILABLE_INTEGRATIONS` automatically.

## Step 5 — Write the `IntegrationNotifier`

File: `app/Services/Integrations/SlackIntegrationNotifier.php` (new)

This is the class that turns a domain event into the integration's
actual wire format and queues delivery. Discord wants "embeds"; Slack
wants "blocks" — every integration's notifier owns its own payload
shape, but they all end up dispatching the same generic
`SendWebhookNotificationJob`.

```php
<?php

namespace App\Services\Integrations;

use App\Contracts\IntegrationNotifier;
use App\Events\CommentAdded;
use App\Events\IssueAssigned;
use App\Events\IssueUnassigned;
use App\Events\IssueUpdated;
use App\Jobs\SendWebhookNotificationJob;
use App\Models\Issue;
use App\Models\ProjectIntegration;
use Illuminate\Support\Str;

class SlackIntegrationNotifier implements IntegrationNotifier
{
    public function handle(ProjectIntegration $projectIntegration, object $event): void
    {
        if (! $projectIntegration->webhook_url) {
            return;
        }

        $text = match (true) {
            $event instanceof IssueAssigned => $this->issueAssignedText($event),
            $event instanceof IssueUnassigned => $this->issueUnassignedText($event),
            $event instanceof IssueUpdated => $this->issueUpdatedText($event),
            $event instanceof CommentAdded => $this->commentAddedText($event),
            default => null,
        };

        if (! $text) {
            return;
        }

        SendWebhookNotificationJob::dispatch($projectIntegration->webhook_url, [
            'text' => $text,
        ]);
    }

    private function issueAssignedText(IssueAssigned $event): string
    {
        $issue = $event->issue;
        $actorName = $event->actor?->name ?? 'Someone';

        return "📌 *Issue #$issue->id assigned* — {$event->assignee->name} was assigned to <{$this->buildActionUrl($issue)}|\"$issue->title\"> by $actorName.";
    }

    private function issueUnassignedText(IssueUnassigned $event): string
    {
        $issue = $event->issue;
        $actorName = $event->actor?->name ?? 'Someone';

        return "📤 *Issue #$issue->id unassigned* — {$event->previousAssignee->name} was unassigned from <{$this->buildActionUrl($issue)}|\"$issue->title\"> by $actorName.";
    }

    private function issueUpdatedText(IssueUpdated $event): ?string
    {
        if (! $event->actor) {
            return null;
        }

        $issue = $event->issue;
        $summary = implode(', ', array_map(fn (array $change) => $change['text'], $event->changes));

        return "📝 *Issue #$issue->id updated* by {$event->actor->name} — <{$this->buildActionUrl($issue)}|\"$issue->title\">: $summary";
    }

    private function commentAddedText(CommentAdded $event): string
    {
        $issue = $event->issue;
        $actorName = $event->actor?->name ?? 'Someone';
        $body = Str::limit(trim(strip_tags($event->comment->body ?? '')), 300);

        return "💬 *New comment on issue #$issue->id* — $actorName on <{$this->buildActionUrl($issue)}|\"$issue->title\">: $body";
    }

    private function buildActionUrl(Issue $issue): string
    {
        return route('projects.show', $issue->project_id).'?issue='.$issue->id;
    }
}
```

Guidelines for writing any new notifier:
- Always guard on `$projectIntegration->webhook_url` being set — a row
  can exist (`enabled = true`) with no webhook URL yet if the user
  toggled it on before configuring one.
- Match on `instanceof` for every event kind you care about; return
  early (`null`/no dispatch) for the rest — a notifier only needs to
  handle the events relevant to the sub-options it's paired with (see
  `NotifyProjectIntegrationsListener`'s category mapping in guide 4).
- `IssueUpdated::actor` is nullable in the type system even though in
  practice `IssueService` only ever fires it with an actor — guard on
  it anyway (see `DiscordIntegrationNotifier::issueUpdatedEmbed`) so a
  future caller can't NPE this class.
- Do the actual HTTP call from `SendWebhookNotificationJob`, never
  directly in the notifier — that keeps every integration's delivery
  queued or retried the same way, for free.

## Step 6 — Register it

File: `app/Services/Integrations/IntegrationNotifierRegistry.php`

```php
private const array MAP = [
    'discord' => DiscordIntegrationNotifier::class,
    'slack' => SlackIntegrationNotifier::class,
];
```

This is the **only** place `NotifyProjectIntegrationsListener` looks up
which class handles which integration key — nothing else needs to
change for the dispatch pipeline to pick it up.

## Step 7 — Flip the catalog entry live

File: `resources/js/types/Integrations.ts`

```ts
comingSoon: false, // was true
```

This one flag does a lot on the frontend automatically: the card's
toggle switch and the modal's per-option toggles stop being
force-disabled, the "New"/"Soon" badge switches to "New", and the
modal header shows a real Connect/Connected button instead of "Coming
soon" — see `WorkspaceSettingsIntegrationCard.tsx` and
`WorkspaceSettingsIntegrationDetailModal.tsx` for exactly where
`integration.comingSoon` is read.

## Step 8 — Tests

Mirror the three Discord test files, swapping in Slack fixtures:

- `tests/Feature/DiscordIntegrationNotifierTest.php` →
  `tests/Feature/SlackIntegrationNotifierTest.php` — one test per event
  kind, asserting on `job->payload` shape (`text` for Slack, `embeds`
  for Discord), plus a "does nothing without a webhook url" test and a
  "does nothing for an update with no actor" test.
- `tests/Feature/NotifyProjectIntegrationsListenerTest.php` — no new
  file needed; add cases there if the new integration has genuinely
  different category-matching behavior (it usually won't — the
  category mapping is per-event, not per-integration).
- `tests/Feature/DiscordWebhookIntegrationEndToEndTest.php` → add a
  Slack-flavored end-to-end test (fire a real `IssueService`/
  `CommentService` call, assert `SendWebhookNotificationJob` was
  pushed) so a regression in the wiring — not just the notifier's unit
  logic — gets caught.
- `tests/Feature/ProjectIntegrationServiceTest.php` — add "it can save
  a valid slack webhook url" / "it rejects a malformed slack webhook
  url" tests mirroring the existing Discord ones, using a real
  `hooks.slack.com/services/...` shaped URL.
- `tests/Feature/ProjectIntegrationControllerTest.php` — the existing
  tests are integration-key-agnostic except for the two "not available
  yet" tests, which pass an integration id that's *never* in
  `AVAILABLE_INTEGRATIONS` (e.g. `'notion'`) — no change needed unless
  you're adding your last remaining catalog integration, in which case
  swap that fixture id for one that's still locked.

Run `php artisan test` and `npm test -- run` before committing — see
the root `CLAUDE.md` for the exact commands.
