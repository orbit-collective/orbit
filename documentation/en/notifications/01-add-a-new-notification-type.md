# Add a new notification type

Worked example: notifying a member when their **project role
changes** — `NotificationType::MemberRoleChanged`. Today,
`ProjectMemberService::updateRole()` only writes an `ActivityLog`
entry; the member whose role changed finds out only if they happen to
check the project's activity feed. This guide fires a real event for
it and wires it all the way through to a notification the member
actually sees (and can turn off).

## The one rule that matters most here

**The frontend settings table is not generated from the backend
enum.** `AccountSettingsNotificationsTab.tsx`'s `defaultNotificationTypes`
array is a separate, hand-maintained list — every backend
`NotificationType` case needs its own entry there, or the setting
exists (the backend fully supports enabling/disabling it, and
`NotificationSettingController`'s validation accepts it) but is
**completely invisible and untoggleable** in Account settings. Step 5
below is the one to not forget.

## Step 1 — Add the enum case

File: `app/Enums/Notifications/NotificationType.php`

```php
<?php

namespace App\Enums\Notifications;

enum NotificationType: string
{
    case IssueAssigned = 'issue_assigned';
    case IssueMentioned = 'issue_mentioned';
    case IssueCommented = 'issue_commented';
    case IssueStatusChanged = 'issue_status_changed';
    case IssuePriorityChanged = 'issue_priority_changed';
    case IssueLabelsChanged = 'issue_labels_changed';
    case IssueDatesChanged = 'issue_dates_changed';
    case IssueUpdated = 'issue_updated';

    case ProjectInvited = 'project_invited';
    case MemberRoleChanged = 'member_role_changed';
}
```

Nothing else needs to know about this case to make it a legal,
storable, toggleable type: `NotificationSetting::casts()` already casts
`type` to this enum generically, and
`UpdateNotificationSettingsRequest::withValidator()` already derives
its allow-list from `NotificationType::cases()` — both work for any
case that exists, with zero changes.

## Step 2 — Create and fire the event

There's no event today for "a member's role changed" — only the
`ActivityLog` line. Add one, following the same conventions as every
other event in `app/Events/` (see
[`../integrations/03-add-a-new-event-type.md`](../integrations/03-add-a-new-event-type.md)
for the full rationale behind these conventions — `final class`,
`Dispatchable`, plain immutable data, no logic):

New file: `app/Events/MemberRoleChanged.php`

```php
<?php

namespace App\Events;

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

final class MemberRoleChanged
{
    use Dispatchable;

    public function __construct(
        public readonly Project $project,
        public readonly User $member,
        public readonly RoleType $newRole,
        public readonly ?User $actor,
    ) {}
}
```

File: `app/Services/ProjectMemberService.php`, `updateRole()` — fire it
**unconditionally** whenever the role actually changes, the same rule
`../integrations/03-add-a-new-event-type.md` calls out for every event:

```php
public function updateRole(Project $project, User $member, RoleType $newRole): void
{
    $this->assertIsMember($project, $member);
    $this->assertNotOwner($project, $member, 'role', "The project owner's role cannot be changed.");

    $this->projectMemberRepository->updateRole($project, $member->id, $newRole);
    $this->roleService->syncSystemRoleForMember($project, $member->id, $newRole);
    $this->activityLogService->log($project->id, "Changed $member->name's role to $newRole->value");

    event(new MemberRoleChanged($project, $member, $newRole, auth()->user()));
}
```

Add `use App\Events\MemberRoleChanged;` to the file's imports.
`auth()->user()` as the actor matches the convention already used by
`IssueService::createIssue()` (`event(new IssueCreated($issue, auth()->user()))`)
— services read the acting user from the auth context rather than
taking it as a parameter.

## Step 3 — Register it and handle it in `SendNotificationListener`

File: `app/Providers/AppServiceProvider.php`, `boot()` — this event is
about role management, not issue/comment activity, so it's registered
for `SendNotificationListener` only, **not**
`NotifyProjectIntegrationsListener` (that's the same "decide
independently per listener" judgment call
[`../integrations/03-add-a-new-event-type.md`](../integrations/03-add-a-new-event-type.md)
step 3 walks through):

```php
Event::listen([
    IssueAssigned::class,
    IssueUnassigned::class,
    IssueUpdated::class,
    CommentAdded::class,
    ProjectInvited::class,
    MemberRoleChanged::class,
], SendNotificationListener::class);
```

Add `use App\Events\MemberRoleChanged;` to the file's imports.

File: `app/Listeners/SendNotificationListener.php`:

```php
public function handle(object $event): void
{
    match (true) {
        $event instanceof IssueAssigned => $this->handleIssueAssigned($event),
        $event instanceof IssueUnassigned => $this->handleIssueUnassigned($event),
        $event instanceof IssueUpdated => $this->handleIssueUpdated($event),
        $event instanceof CommentAdded => $this->handleCommentAdded($event),
        $event instanceof ProjectInvited => $this->handleProjectInvited($event),
        $event instanceof MemberRoleChanged => $this->handleMemberRoleChanged($event),
        default => null,
    };
}

private function handleMemberRoleChanged(MemberRoleChanged $event): void
{
    if (! $event->actor || $event->actor->id === $event->member->id) {
        return;
    }

    $actorName = $event->actor->name ?? 'Someone';

    $this->notificationService->notify(
        $event->member->id,
        NotificationType::MemberRoleChanged,
        'info',
        'Your role was changed',
        "$actorName changed your role in \"{$event->project->name}\" to {$event->newRole->value}.",
        route('projects.show', $event->project->id)
    );
}
```

Add `use App\Events\MemberRoleChanged;` to this file's imports too.
The actor/member guard mirrors `handleCommentAdded()`'s "don't notify
someone about their own action" pattern — relevant here because
nothing today stops an Owner/Admin from changing their *own* row
through the same code path in a future refactor.

## Step 4 — Decide the delivery default (there's nothing to configure)

There's no per-type default to set here — every `NotificationType`
starts at whatever `NotificationChannel::enabledByDefault()` says
(`InApp` on, `Email` off) until a user overrides it for that specific
type. `MemberRoleChanged` gets exactly the same starting point as
every other type, for free.

## Step 5 — Add the frontend settings row (don't skip this)

File: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsNotificationsTab.tsx`

Add an entry to `defaultNotificationTypes`:

```ts
{
    id: 'member_role_changed',
    icon: 'ShieldCheck',
    title: 'Role changes',
    description: 'When your role in a project is changed.',
    inApp: true,
    email: false,
},
```

`inApp: true, email: false` here are just this array's own fallback
values, read before the real per-user settings arrive from the
backend (`mergeNotificationSettings()`) — keep them in sync with
`NotificationChannel::enabledByDefault()` from step 4 so the toggle
doesn't flash the wrong state on first paint. `icon` is any
`lucide-react` icon name (see the existing entries for the icons
already in use); pick one that isn't already representing a
conceptually different type.

Without this step, `MemberRoleChanged` is fully functional on the
backend — notifications fire, the setting is fully readable/writable
through the API — but no member can ever see or change their
preference for it, because `mergeNotificationSettings()` only ever
iterates `defaultNotificationTypes`, never the raw settings object
from the backend.

## Step 6 — Tests

- `tests/Feature/ProjectMemberServiceTest.php` — add
  `'it fires MemberRoleChanged when a member's role changes'`,
  `Event::fake()`'d, calling `$this->actingAs($admin)` first so
  `auth()->user()` resolves to a real actor:
  ```php
  test('it fires MemberRoleChanged when a member\'s role changes', function () {
      Event::fake();
      $project = Project::factory()->create();
      $admin = User::factory()->create();
      $member = User::factory()->create();
      $project->users()->attach($admin->id, ['role' => 'admin']);
      $project->users()->attach($member->id, ['role' => 'member']);
      $this->actingAs($admin);

      $this->service->updateRole($project, $member, RoleType::ADMIN);

      Event::assertDispatched(
          MemberRoleChanged::class,
          fn ($event) => $event->member->is($member) && $event->newRole === RoleType::ADMIN && $event->actor->is($admin),
      );
  });
  ```
- `tests/Feature/SendNotificationListenerTest.php` — mirror the
  `ProjectInvited` tests' Mockery shape:
  ```php
  test('MemberRoleChanged notifies the member about the actor\'s change', function () {
      $project = Project::factory()->create(['name' => 'Orbit']);
      $actor = User::factory()->create(['name' => 'Bob']);
      $member = User::factory()->create();

      $this->notificationService->shouldReceive('notify')
          ->once()
          ->with(
              $member->id,
              NotificationType::MemberRoleChanged,
              'info',
              'Your role was changed',
              'Bob changed your role in "Orbit" to admin.',
              route('projects.show', $project->id)
          );

      $this->listener->handle(new MemberRoleChanged($project, $member, RoleType::ADMIN, $actor));
  });

  test('MemberRoleChanged does nothing without an actor', function () {
      $project = Project::factory()->create();
      $member = User::factory()->create();

      $this->notificationService->shouldNotReceive('notify');

      $this->listener->handle(new MemberRoleChanged($project, $member, RoleType::ADMIN, null));
  });
  ```
- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsNotificationsTab.test.tsx`
  — the existing `'renders each notification type with its in-app and
  email toggles'` test asserts an exact row count/list; update it to
  include `member_role_changed`, and add a
  `'hydrates toggles from the notificationSettings prop'`-style case
  for the new id if you want to confirm the merge picks it up.
- `tests/Feature/NotificationSettingControllerTest.php` — no change
  needed; `'updating notification settings rejects an unknown
  notification type'` already covers the generic
  `NotificationType::cases()` allow-list, which includes
  `MemberRoleChanged` automatically now that step 1 exists.
