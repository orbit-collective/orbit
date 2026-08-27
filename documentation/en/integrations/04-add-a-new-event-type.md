# Add a new event type

Worked example: adding `IssueCreated` — a kind of activity that
**doesn't exist yet**. Today, creating an issue only fires
`IssueAssigned`, and only if it's created with an assignee other than
the creator (see `IssueService::createIssue()`). There is no event at
all for "an issue was created" as a fact in its own right. This guide
adds one, end to end: fired from the right place, consumed by both the
in-app-notification listener and the integrations listener, rendered
as a new Discord embed.

## The one rule that matters most here

**An event must fire whenever the fact it describes is true — never
conditionally on who might care about it.** "Should the assignee be
notified about this" or "should this post to Discord" are
listener-side decisions, not event-firing-side decisions.

This codebase already had a real bug from getting this backwards:
`CommentService::addComment()` used to only fire `CommentAdded` when
the issue had an assignee *and* the commenter wasn't them — a rule that
made sense for "don't notify someone about their own comment" but
silently also killed the Discord webhook for the exact same comments,
because `NotifyProjectIntegrationsListener` listens to the same event
and had no way to distinguish "this didn't happen" from "this happened
but the emitter decided you don't need to know." The fix moved that
filtering into `SendNotificationListener::handleCommentAdded()`, and
`CommentAdded` now always fires. Don't reintroduce this mistake for a
new event.

## Step 1 — Create the event class

New file: `app/Events/IssueCreated.php`

```php
<?php

namespace App\Events;

use App\Models\Issue;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Fired whenever a new issue is created, regardless of whether it was
 * given an assignee at creation time (that's a separate fact, reported
 * by IssueAssigned when relevant — see IssueService::createIssue()).
 */
final class IssueCreated
{
    use Dispatchable;

    public function __construct(
        public readonly Issue $issue,
        public readonly ?User $actor,
    ) {}
}
```

Conventions to follow (see every existing class in `app/Events/` for
more examples):
- `final class`, `use Dispatchable;` (lets you call
  `IssueCreated::dispatch(...)` as an alternative to the global
  `event(new IssueCreated(...))` — both work identically; this codebase
  uses the global function at every call site).
- Constructor-promoted `public readonly` properties — an event is a
  plain, immutable data carrier. It does **no work** — no notification
  logic, no DB writes, nothing conditional.
- Carry whatever raw data a consumer might need to build its own
  message (the `Issue` model, the acting `User` or `null`) — not
  pre-built strings. Building the actual title/description/embed is
  each listener's job (see steps 3–5), so two different consumers can
  describe the same fact completely differently.

## Step 2 — Fire it from the right place

File: `app/Services/IssueService.php`, `createIssue()`:

```php
public function createIssue(array $data): Issue
{
    $data['user_id'] = auth()->id();

    $issue = $this->issueRepository->store($data);
    $this->activityLogService->log($issue->project_id, "Added new task: #$issue->id");

    event(new IssueCreated($issue, auth()->user()));

    if ($issue->assignee_id && $issue->assignee_id !== auth()->id()) {
        event(new IssueAssigned($issue, $issue->assignee, auth()->user()));
    }

    return $issue;
}
```

Note this fires **unconditionally** — every created issue gets an
`IssueCreated` event, whether or not it has an assignee, whether or not
the creator assigned it to themself. The existing `IssueAssigned` guard
right below it is fine to keep as-is: that condition ("don't fire
'you were assigned' when you assigned it to yourself") is about
*IssueAssigned specifically not making sense in that case* — it's not
filtering IssueCreated, and IssueCreated already covers "an issue now
exists" regardless of how step 2's assignment turns out. Don't add the
new event only inside that `if` — that would be exactly the same
mistake as the old `CommentAdded` bug, just for a different event.

Add `use App\Events\IssueCreated;` to the top of the file alongside the
existing `App\Events\*` imports.

## Step 3 — Register it for the listener(s) that should react

File: `app/Providers/AppServiceProvider.php`, `boot()`

You decide **independently per listener** whether it should see this
event — registering it for one doesn't imply the other:

```php
// In-app/email notifications: does anyone need a "new issue" notification?
// Arguably not for every issue in the project — skip registering
// IssueCreated here unless you have a concrete notification to send.
Event::listen([
    IssueAssigned::class,
    IssueUnassigned::class,
    IssueUpdated::class,
    CommentAdded::class,
    ProjectInvited::class,
], SendNotificationListener::class);

// Integrations: yes, "issue created" is squarely what the
// "issue-activity" sub-option promises ("Post a message when an issue
// is created, assigned, or resolved").
Event::listen([
    IssueAssigned::class,
    IssueUnassigned::class,
    IssueUpdated::class,
    CommentAdded::class,
    IssueCreated::class, // <- new
], NotifyProjectIntegrationsListener::class);
```

If you *do* want an in-app notification too (e.g. "notify all project
members when a new issue is created" — not implemented today), add
`IssueCreated::class` to `SendNotificationListener`'s list as well, and
give that listener a new `handleIssueCreated()` case (step 4). The two
listeners are completely independent consumers of the same event — a
listener registered for an event it doesn't have a `match` case for
just falls through to `default => null` and does nothing, safely.

## Step 4 — (optional) handle it in `SendNotificationListener`

Only do this if there's an actual notification to send. Pattern to
follow, in `app/Listeners/SendNotificationListener.php`:

```php
public function handle(object $event): void
{
    match (true) {
        $event instanceof IssueAssigned => $this->handleIssueAssigned($event),
        $event instanceof IssueUnassigned => $this->handleIssueUnassigned($event),
        $event instanceof IssueUpdated => $this->handleIssueUpdated($event),
        $event instanceof CommentAdded => $this->handleCommentAdded($event),
        $event instanceof IssueCreated => $this->handleIssueCreated($event), // new
        $event instanceof ProjectInvited => $this->handleProjectInvited($event),
        default => null,
    };
}

private function handleIssueCreated(IssueCreated $event): void
{
    // e.g. notify project members other than the creator — left
    // unimplemented here since it's a product decision, not a wiring one.
}
```

## Step 5 — Handle it in `NotifyProjectIntegrationsListener` + the notifier(s)

File: `app/Listeners/NotifyProjectIntegrationsListener.php`,
`resolveContext()`:

```php
private function resolveContext(object $event): array
{
    return match (true) {
        $event instanceof IssueAssigned,
        $event instanceof IssueUnassigned,
        $event instanceof IssueUpdated,
        $event instanceof IssueCreated => [$event->issue->project, 'issue-activity'], // added IssueCreated here
        $event instanceof CommentAdded => [$event->issue->project, 'comment-activity'],
        default => [null, null],
    };
}
```

This is the only change needed in this listener — it stays completely
generic. It doesn't know or care that `IssueCreated` is new; it just
needs to know which sub-option category the event belongs to, and
`$event->issue->project` is available the same way it is on every
other issue-related event.

File: `app/Services/Integrations/DiscordIntegrationNotifier.php` — add
a `match` branch and an embed builder:

```php
public function handle(ProjectIntegration $projectIntegration, object $event): void
{
    if (! $projectIntegration->webhook_url) {
        return;
    }

    $embed = match (true) {
        $event instanceof IssueCreated => $this->issueCreatedEmbed($event), // new
        $event instanceof IssueAssigned => $this->issueAssignedEmbed($event),
        $event instanceof IssueUnassigned => $this->issueUnassignedEmbed($event),
        $event instanceof IssueUpdated => $this->issueUpdatedEmbed($event),
        $event instanceof CommentAdded => $this->commentAddedEmbed($event),
        default => null,
    };

    if (! $embed) {
        return;
    }

    SendWebhookNotificationJob::dispatch($projectIntegration->webhook_url, [
        'username' => 'Orbit',
        'embeds' => [$embed],
    ]);
}

private function issueCreatedEmbed(IssueCreated $event): ?array
{
    if (! $event->actor) {
        return null;
    }

    $issue = $event->issue;

    return $this->baseEmbed(
        "🆕 Issue #$issue->id created",
        "**{$event->actor->name}** created **\"$issue->title\"**.",
        self::COLOR_CREATED, // add e.g. `private const int COLOR_CREATED = 0xFEE75C;` (Discord yellow) near the other color constants
        $issue,
    );
}
```

Every existing `*Embed()` method follows the same three-part shape:
build a **title** (with an emoji + `#id action`), a **description**
(bold names, quoted issue title, who did it), and reuse `baseEmbed()`
for the boilerplate (`url`, `timestamp`, `footer`) — copy that shape
exactly for a new event kind so every embed reads consistently in
Discord.

If you're adding a *second* integration (see guide 1), repeat this
step in its notifier too (e.g. `SlackIntegrationNotifier`) — each
notifier independently decides which event kinds it renders; there's
no shared "which events exist" registry to update beyond the `match`
arms in each notifier class.

## Step 6 — Tests

Four places, mirroring exactly how `IssueAssigned`/`CommentAdded` are
covered:

**`tests/Feature/IssueServiceTest.php`** — assert the event fires:
```php
test('createIssue fires IssueCreated for every new issue', function () {
    $user = User::factory()->create();
    $this->actingAs($user);
    $data = ['project_id' => 1, 'title' => 'New Issue'];
    $issue = new Issue(['id' => 42, 'project_id' => 1, 'title' => 'New Issue']);
    $this->issueRepository->shouldReceive('store')->once()->andReturn($issue);
    $this->activityLogService->shouldReceive('log')->once();

    $this->service->createIssue($data);

    Event::assertDispatched(
        IssueCreated::class,
        fn ($event) => $event->issue->is($issue) && $event->actor->is($user),
    );
});
```

**`tests/Feature/DiscordIntegrationNotifierTest.php`** — one embed
test plus a "no actor → nothing queued" test, copying the
`issueAssignedEmbed`/`issueUpdatedEmbed` test shapes exactly:
```php
test('it queues a yellow embed for a new issue', function () {
    $project = Project::factory()->create();
    $integration = ($this->makeIntegration)($project);
    $issue = Issue::factory()->create(['id' => 15, 'project_id' => $project->id, 'title' => 'New feature']);
    $actor = User::factory()->create(['name' => 'Erin']);

    $this->notifier->handle($integration, new IssueCreated($issue, $actor));

    Queue::assertPushed(SendWebhookNotificationJob::class, function (SendWebhookNotificationJob $job) {
        $embed = $job->payload['embeds'][0];

        return $embed['color'] === 0xFEE75C
            && str_contains($embed['title'], '#15 created')
            && str_contains($embed['description'], 'Erin');
    });
});
```

**`tests/Feature/NotifyProjectIntegrationsListenerTest.php`** — confirm
`IssueCreated` routes through the `issue-activity` category exactly
like the other three issue events (copy the
`'it notifies an enabled discord integration opted into issue
activity'` test, swap the event).

**`tests/Feature/DiscordWebhookIntegrationEndToEndTest.php`** — the
real regression-catcher: call `IssueService::createIssue()` through
the container (not the event directly) with a configured, enabled
integration, and assert `SendWebhookNotificationJob` was pushed. This
is what would have caught the original `CommentAdded` bug immediately
— always add one of these for a new event, not just unit-level
listener/notifier tests.
