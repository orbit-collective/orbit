# Send a notification from your code

Guide 01 covers wiring a domain event through `SendNotificationListener`
into `NotificationService::notify()`. You don't always need an event
in between — `notify()` is a normal service method, callable directly
from anywhere, and going through an event only matters when more than
one consumer needs to react to the same fact (notifications *and*
integrations, say). Worked example: a "Remind assignee" button that
sends a one-off reminder — a deliberate, single-purpose user action
with exactly one consumer, so it calls `notify()` directly instead of
introducing an event nothing else will ever listen for.

## The `notify()` contract

File: `app/Services/NotificationService.php`

```php
public function notify(int $userId, NotificationType $notificationType, string $type, string $title, string $message, ?string $actionUrl = null): ?Notification
```

- **`$userId`** — the recipient. Always a single user; to notify
  several people, call `notify()` once per recipient (see
  `SendNotificationListener::handleIssueUpdated()`'s two separate
  loops for actor vs. assignee).
- **`$notificationType`** — which `NotificationType` this is. This is
  what the recipient's per-type/per-channel `NotificationSetting`
  gates on — pick an existing case if the notification is a variant of
  something that already exists (as this guide does, reusing
  `IssueUpdated`), or add a new one first (guide 01) if it deserves its
  own toggle in Account settings.
- **`$type`** — a **UI severity string**, `'success'|'info'|'warning'|'error'`
  (validated in `NotificationController::update()`). This is unrelated
  to `$notificationType` and not user-configurable — it only affects
  how the in-app notification might be styled. Every existing call
  site uses `'info'`.
- **`$title`** / **`$message`** — plain text, used verbatim as both the
  in-app notification's title/message and the email's subject/body
  (`NotificationMailService::send()` passes them straight into
  `NotificationMail`). There's no per-channel wording — write one
  message that reads fine in both places.
- **`$actionUrl`** — optional; renders as the in-app "View details"
  link (`NotificationItem.tsx`) and the email's CTA button
  (`resources/views/emails/notification.blade.php`). Every existing
  call site builds this with `route(...)`, never a hand-built string.
- **Return value** — the persisted `Notification` row, or `null` if
  the recipient has in-app disabled for this type (email may still
  have been sent either way — the two channels are independent, see
  below).

## What actually happens per channel

`notify()` always does both of these, unconditionally, in this order:

1. **Email**, via `NotificationMailService::send()` — checks the
   recipient's `NotificationChannel::Email` setting for this
   `$notificationType` (default: **off**, see
   `NotificationChannel::enabledByDefault()`); if enabled, queues a
   `NotificationMail` (rate-limited, retried up to 5 times on
   transient SMTP failures — see `NotificationMail::$tries`/`backoff()`).
   This is **not** gated by `MailConfigurationService` — that service
   only gates the project-invitation email flow and a `mailEnabled`
   Inertia prop used to show a "configure email" banner elsewhere.
   Every other notification email is attempted through Laravel's
   normal `mail.default` config regardless; if that's `log` or
   `array`, the "send" just writes to the log/an in-memory array
   instead of an inbox — nothing errors, so don't be surprised email
   notifications "work" in every environment without actually
   delivering anywhere until a real mailer is configured.
2. **In-app**, only if the recipient's `NotificationChannel::InApp`
   setting for this type is enabled (default: **on**) — persists a
   `Notification` row. Skipped entirely otherwise; no row is ever
   written for a disabled channel.

## Step 1 — Inject `NotificationService`

File: `app/Services/IssueService.php`

```php
public function __construct(
    protected IssueRepository $issueRepository,
    protected ActivityLogService $activityLogService,
    protected UserService $userService,
    protected NotificationService $notificationService,
) {}
```

Add `use App\Services\NotificationService;` and
`use App\Enums\Notifications\NotificationType;` to the file's imports.

## Step 2 — Add the service method

File: `app/Services/IssueService.php`

```php
public function remindAssignee(Issue $issue): void
{
    if (! $issue->assignee_id) {
        throw ValidationException::withMessages([
            'assignee' => 'This issue has no assignee to remind.',
        ]);
    }

    $actorName = auth()->user()?->name ?? 'Someone';

    $this->notificationService->notify(
        $issue->assignee_id,
        NotificationType::IssueUpdated,
        'info',
        'Reminder',
        "$actorName sent you a reminder about \"$issue->title\" (#$issue->id).",
        route('projects.show', $issue->project_id).'?issue='.$issue->id
    );
}
```

Add `use Illuminate\Validation\ValidationException;` if not already
imported. `NotificationType::IssueUpdated` is reused here rather than
adding a dedicated type — a manual reminder is a variant of "something
changed about an issue you care about," and doesn't need its own
Account settings row unless you specifically want it independently
toggleable (in which case, do guide 01 first, then swap the type
here).

## Step 3 — Controller action and route

File: `app/Http/Controllers/IssueController.php`

```php
public function remindAssignee(Project $project, Issue $issue): RedirectResponse
{
    if ($issue->project_id !== $project->id) {
        throw new NotFoundHttpException;
    }

    $this->authorize('update', $issue);

    $this->issueService->remindAssignee($issue);

    return redirect()->back()->with('success', 'A reminder has been sent.');
}
```

This reuses `IssuePolicy::update` — sending a reminder is gated the
same as any other issue-management action, not worth its own
permission for a low-stakes, easily-repeatable action.

File: `routes/web.php`, next to the other `issues/{issue}` routes:

```php
Route::post('/projects/{project}/issues/{issue}/remind', [IssueController::class, 'remindAssignee'])->name('issues.remind');
```

## Step 4 — Tests

- `tests/Feature/IssueServiceTest.php` — its `beforeEach` constructs
  `IssueService` manually; add the new dependency:
  ```php
  beforeEach(function () {
      $this->issueRepository = Mockery::mock(IssueRepository::class);
      $this->activityLogService = Mockery::mock(ActivityLogService::class);
      $this->userService = Mockery::mock(UserService::class);
      $this->userService->shouldReceive('getUserById')->andReturnUsing(fn ($id) => User::find($id));
      $this->notificationService = Mockery::mock(NotificationService::class);
      $this->service = new IssueService($this->issueRepository, $this->activityLogService, $this->userService, $this->notificationService);
      Event::fake();
  });
  ```
  then add:
  ```php
  test('remindAssignee notifies the assignee', function () {
      $actor = User::factory()->create(['name' => 'Bob']);
      $this->actingAs($actor);
      $issue = Issue::factory()->create(['id' => 7, 'project_id' => 1, 'title' => 'Fix login', 'assignee_id' => 99]);

      $this->notificationService->shouldReceive('notify')
          ->once()
          ->with(99, NotificationType::IssueUpdated, 'info', 'Reminder', 'Bob sent you a reminder about "Fix login" (#7).', Mockery::type('string'));

      $this->service->remindAssignee($issue);
  });

  test('remindAssignee rejects an issue with no assignee', function () {
      $issue = Issue::factory()->create(['assignee_id' => null]);

      expect(fn () => $this->service->remindAssignee($issue))
          ->toThrow(ValidationException::class);
  });
  ```
- `tests/Feature/IssueControllerTest.php` — add a "an assignable
  member can remind the assignee" test (asserts a redirect + success
  flash) and "a member without issues.update access cannot remind the
  assignee" (mirrors the existing `update`-gated tests), plus "reminding
  through a mismatched project 404s" copying the existing pattern from
  other issue routes.
