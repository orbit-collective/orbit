# Dodaj dedykowany mail transakcyjny

Przewodnik 2 pokrywa ponowne użycie generycznego szablonu `NotificationMail` (jeden współdzielony układ tematu/treści/przycisku akcji dla każdego `NotificationType`). Czasem to niewłaściwe narzędzie: **`ProjectInvitationMail` już udowadnia ten wzorzec dla innego przypadku** — zaproszenie do projektu zawsze musi zostać wysłane mailem (nie ma odpowiednika w aplikacji, a odbiorca może nawet nie mieć jeszcze konta, żeby trzymać preferencję), i potrzebuje własnego tematu i layoutu, nie generycznego. Ten przewodnik dodaje drugi dedykowany mail tego kształtu: powiadamianie nowego właściciela mailem — zawsze, niezależnie od jego ustawień powiadomień — gdy własność projektu zostaje na niego przeniesiona.

## Kiedy sięgnąć po to zamiast po `NotificationService::notify()`

Użyj dedykowanej klasy `Notification` (ten przewodnik), gdy mail:
- musi zostać wysłany **bezwarunkowo**, ignorując preferencje `NotificationSetting` odbiorcy (przeniesienie własności jest wystarczająco poważne, żeby "wyłączyłem maile" nie miało go wyciszać, tak samo jak mail z zaproszeniem nie może respektować preferencji, które jeszcze nie istnieją dla kogoś, kto nie jest użytkownikiem).
- potrzebuje **własnego tematu i układu treści**, nie generycznego kształtu tytuł/wiadomość/przycisk, jaki renderuje `NotificationMail`/`emails/notification.blade.php`.

W przeciwnym razie preferuj `NotificationService::notify()` z przewodnika 2 — to mniej kodu i jedyna ścieżka, która dodatkowo tworzy powiadomienie w aplikacji i respektuje preferencje per użytkownik.

## Krok 1 — Stwórz klasę Notification

Nowy plik: `app/Notifications/OwnershipTransferredMail.php`

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

Każde pole tutaj odzwierciedla dokładnie `ProjectInvitationMail`: `ShouldQueue` + `Queueable`, `$tries`/`backoff()` dla ponawiania przy przejściowych błędach SMTP, współdzielony `RateLimiter` `'emails'` (zarejestrowany raz w `AppServiceProvider::boot()` — `RateLimiter::for('emails', fn () => Limit::perSecond(2))` — każda wysyłająca mail `Notification` w tym repozytorium ponownie używa tego samego nazwanego limitera, nie rejestruj nowego), oraz własny `subject()`/`view()` w `toMail()` zamiast delegowania do współdzielonego widoku `emails.notification`.

## Krok 2 — Stwórz widok

Nowy plik: `resources/views/emails/ownership-transferred.blade.php`

```blade
@extends('emails.layout')

@section('subject', "You're now the owner of \"{$project->name}\"")

@section('content')
    <h1 class="email-text" style="margin:0 0 16px; font-size:20px; line-height:28px; color:#f7f7f8;">You're the new owner of "{{ $project->name }}"</h1>

    <p class="email-text" style="margin:0 0 24px; color:#f7f7f8;">{{ $previousOwner->name }} transferred ownership of "{{ $project->name }}" to you. You now have full control over the project's settings, members, and roles.</p>

    @include('emails.partials.button', ['url' => route('projects.show', $project->id), 'text' => 'View project'])
@endsection
```

Każdy mail transakcyjny robi `@extends('emails.layout')` — to właśnie stąd bierze się baner, kontener świadomy trybu ciemnego/jasnego i stopka "dostrój swoje powiadomienia" za darmo (zobacz `emails/layout.blade.php`); nigdy nie buduj pełnego dokumentu HTML ręcznie. Do każdego linku call-to-action użyj ponownie `emails.partials.button` zamiast surowego `<a>`, żeby stylowanie przycisku było identyczne w każdym mailu.

## Krok 3 — Wystrzel go z właściwego miejsca

Plik: `app/Services/ProjectMemberService.php`, `transferOwnership()`:

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

Dodaj `use App\Notifications\OwnershipTransferredMail;` do importów tego pliku. `$newOwner->notify(...)` — standardowy trait `Illuminate\Notifications\Notifiable` na `User` — to sposób wysyłania do prawdziwego, istniejącego użytkownika; routing na żądanie (`Notification::route('mail', $email)->notify(...)`, jak używa `ProjectInvitationService::sendInvitationNotification()`) jest tylko dla odbiorców, którzy mogą jeszcze nie mieć wiersza `User`.

## Krok 4 — Testy

- Nowy plik `tests/Feature/Notifications/OwnershipTransferredMailTest.php` — odzwierciedla dokładnie kształt `tests/Feature/Notifications/NotificationMailTest.php`:
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
- `tests/Feature/ProjectMemberServiceTest.php` — dodaj `Notification::fake()` (import `Illuminate\Support\Facades\Notification`) do testu `'it can transfer ownership to another member and demotes the previous owner to admin'`, a następnie asercuj:
  ```php
  Notification::assertSentTo($member, OwnershipTransferredMail::class);
  ```
- `tests/Feature/ProjectMemberControllerTest.php` — bez zmian; już ćwiczy tę samą ścieżkę kodu `transferOwnership()` pośrednio przez warstwę HTTP i nie asercuje na powiadomieniach.
