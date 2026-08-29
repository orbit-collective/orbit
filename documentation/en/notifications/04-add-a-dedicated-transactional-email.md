# Add a dedicated transactional email

Guide 02 covers reusing the generic `NotificationMail` template (one
shared subject/body/action-button layout for every `NotificationType`).
Sometimes that's the wrong tool: **`ProjectInvitationMail` already
proves this pattern for a different case** — a project invitation must
always be emailed (there's no in-app equivalent, and the recipient
might not even have an account yet to hold a preference), and it needs
its own subject line and layout, not the generic one. This guide adds
a second dedicated email of that shape: notifying the new owner by
email — always, regardless of their notification settings — when
project ownership is transferred to them.

## When to reach for this instead of `NotificationService::notify()`

Use a dedicated `Notification` class (this guide) when the email:
- must go out **unconditionally**, ignoring the recipient's
  `NotificationSetting` preferences (an ownership transfer is
  consequential enough that "I turned off emails" shouldn't silence it,
  the same way an invitation email can't respect preferences that don't
  exist yet for a non-user).
- needs its **own subject line and content layout**, not the generic
  title/message/button shape `NotificationMail`/`emails/notification.blade.php`
  renders.

Otherwise, prefer guide 02's `NotificationService::notify()` — it's
less code, and it's the only path that also produces an in-app
notification and respects per-user preferences.

## Step 1 — Create the Notification class

New file: `app/Notifications/OwnershipTransferredMail.php`

```php
<?php

namespace App\Notifications;

use App\Models\Project;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\Middleware\RateLimited;

class OwnershipTransferredMail extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public function __construct(
        public readonly Project $project,
        public readonly User $previousOwner,
    ) {}

    public function backoff(): array
    {
        return [10, 30, 60, 120];
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function middleware(object $notifiable, string $channel): array
    {
        return match ($channel) {
            'mail' => [new RateLimited('emails')],
            default => [],
        };
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("You're now the owner of \"{$this->project->name}\"")
            ->view('emails.ownership-transferred', [
                'project' => $this->project,
                'previousOwner' => $this->previousOwner,
            ]);
    }
}
```

Every field here mirrors `ProjectInvitationMail` exactly: `ShouldQueue`
+ `Queueable`, `$tries`/`backoff()` for transient SMTP retries, the
shared `'emails'` `RateLimiter` (already registered once in
`AppServiceProvider::boot()` — `RateLimiter::for('emails', fn () =>
Limit::perSecond(2))` — every mail-sending `Notification` in this
codebase reuses this same named limiter, don't register a new one),
and a bespoke `subject()`/`view()` in `toMail()` instead of delegating
to the shared `emails.notification` view.

## Step 2 — Create the view

New file: `resources/views/emails/ownership-transferred.blade.php`

```blade
@extends('emails.layout')

@section('subject', "You're now the owner of \"{$project->name}\"")

@section('content')
    <h1 class="email-text" style="margin:0 0 16px; font-size:20px; line-height:28px; color:#f7f7f8;">You're the new owner of "{{ $project->name }}"</h1>

    <p class="email-text" style="margin:0 0 24px; color:#f7f7f8;">{{ $previousOwner->name }} transferred ownership of "{{ $project->name }}" to you. You now have full control over the project's settings, members, and roles.</p>

    @include('emails.partials.button', ['url' => route('projects.show', $project->id), 'text' => 'View project'])
@endsection
```

Every transactional email `@extends('emails.layout')` — that's what
gives it the banner, dark/light-aware container, and the "fine-tune
your notifications" footer for free (see `emails/layout.blade.php`);
never build a full HTML document by hand. Reuse
`emails.partials.button` for any call-to-action link rather than a raw
`<a>`, so the button styling stays identical across every email.

## Step 3 — Fire it from the right place

File: `app/Services/ProjectMemberService.php`, `transferOwnership()`:

```php
public function transferOwnership(Project $project, User $currentOwner, User $newOwner): void
{
    if ($this->projectMemberRepository->roleOf($project, $currentOwner->id) !== RoleType::OWNER) {
        throw ValidationException::withMessages([
            'owner' => 'Only the current owner can transfer ownership.',
        ]);
    }

    $this->assertIsMember($project, $newOwner);

    if ($newOwner->id === $currentOwner->id) {
        throw ValidationException::withMessages([
            'user' => 'This user already owns the project.',
        ]);
    }

    $this->projectMemberRepository->updateRole($project, $currentOwner->id, RoleType::ADMIN);
    $this->projectMemberRepository->updateRole($project, $newOwner->id, RoleType::OWNER);
    $this->roleService->syncSystemRoleForMember($project, $currentOwner->id, RoleType::ADMIN);
    $this->roleService->syncSystemRoleForMember($project, $newOwner->id, RoleType::OWNER);

    $this->activityLogService->log(
        $project->id,
        "Transferred project ownership from $currentOwner->name to $newOwner->name"
    );

    $newOwner->notify(new OwnershipTransferredMail($project, $currentOwner));
}
```

Add `use App\Notifications\OwnershipTransferredMail;` to the file's
imports. `$newOwner->notify(...)` — Laravel's standard
`Illuminate\Notifications\Notifiable` trait on `User` — is how you
send to a real, existing user; on-demand routing
(`Notification::route('mail', $email)->notify(...)`, as
`ProjectInvitationService::sendInvitationNotification()` uses) is only
for recipients who might not have a `User` row yet.

## Step 4 — Tests

- New file `tests/Feature/Notifications/OwnershipTransferredMailTest.php`
  — mirror `tests/Feature/Notifications/NotificationMailTest.php`'s
  shape exactly:
  ```php
  <?php

  use App\Models\Project;
  use App\Models\User;
  use App\Notifications\OwnershipTransferredMail;
  use Illuminate\Foundation\Testing\RefreshDatabase;
  use Illuminate\Queue\Middleware\RateLimited;

  uses(RefreshDatabase::class);

  test('it sends only via mail', function () {
      $project = Project::factory()->make();
      $previousOwner = User::factory()->make();
      $notification = new OwnershipTransferredMail($project, $previousOwner);

      expect($notification->via(new User))->toBe(['mail']);
  });

  test('it builds a mail message with the subject and renders the project and previous owner', function () {
      $project = Project::factory()->make(['name' => 'Orbit']);
      $previousOwner = User::factory()->make(['name' => 'Ada Lovelace']);
      $newOwner = User::factory()->make();
      $notification = new OwnershipTransferredMail($project, $previousOwner);

      $mail = $notification->toMail($newOwner);

      expect($mail->subject)->toBe('You\'re now the owner of "Orbit"')
          ->and($mail->view)->toBe('emails.ownership-transferred')
          ->and($mail->viewData['project'])->toBe($project)
          ->and($mail->viewData['previousOwner'])->toBe($previousOwner);

      $rendered = $mail->render();

      expect($rendered)->toContain('Ada Lovelace transferred ownership of "Orbit" to you')
          ->and($rendered)->toContain('View project');
  });

  test('it rate-limits the mail channel', function () {
      $project = Project::factory()->make();
      $previousOwner = User::factory()->make();
      $notification = new OwnershipTransferredMail($project, $previousOwner);

      $middleware = $notification->middleware(new User, 'mail');

      expect($middleware)->toHaveCount(1)
          ->and($middleware[0])->toBeInstanceOf(RateLimited::class);
  });
  ```
- `tests/Feature/ProjectMemberServiceTest.php` — add
  `Notification::fake()` (import `Illuminate\Support\Facades\Notification`)
  to `'it can transfer ownership to another member and demotes the
  previous owner to admin'`, then assert:
  ```php
  Notification::assertSentTo($member, OwnershipTransferredMail::class);
  ```
- `tests/Feature/ProjectMemberControllerTest.php` — no change needed;
  it already exercises the same `transferOwnership()` code path
  indirectly through the HTTP layer, and doesn't assert on
  notifications.
