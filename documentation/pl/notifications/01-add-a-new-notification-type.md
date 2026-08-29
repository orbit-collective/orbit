# Dodaj nowy typ powiadomienia

Przećwiczony przykład: powiadamianie członka, gdy zmieni się jego **rola w projekcie** — `NotificationType::MemberRoleChanged`. Dziś `ProjectMemberService::updateRole()` zapisuje tylko wpis w `ActivityLog`; członek, którego rola się zmieniła, dowiaduje się o tym tylko wtedy, gdy przypadkiem zajrzy do feedu aktywności projektu. Ten przewodnik wystrzeliwuje dla tego prawdziwy event i podłącza go aż do powiadomienia, które członek faktycznie zobaczy (i będzie mógł wyłączyć).

## Najważniejsza zasada w tym przewodniku

**Tabela ustawień na froncie nie jest generowana z enuma backendu.** Tablica `defaultNotificationTypes` w `AccountSettingsNotificationsTab.tsx` to osobna, ręcznie utrzymywana lista — każdy przypadek `NotificationType` z backendu potrzebuje własnego wpisu tam, inaczej ustawienie istnieje (backend w pełni obsługuje jego włączanie/wyłączanie, a walidacja w `NotificationSettingController` je akceptuje), ale jest **całkowicie niewidoczne i nieprzełączalne** w ustawieniach konta. Krok 5 poniżej to ten, o którym nie wolno zapomnieć.

## Krok 1 — Dodaj przypadek enuma

Plik: `app/Enums/Notifications/NotificationType.php`

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

Nic więcej nie musi wiedzieć o tym przypadku, żeby był legalnym, zapisywalnym, przełączalnym typem: `NotificationSetting::casts()` już rzutuje `type` na ten enum generycznie, a `UpdateNotificationSettingsRequest::withValidator()` już wyprowadza swoją listę dozwolonych wartości z `NotificationType::cases()` — oba działają dla dowolnego istniejącego przypadku, bez żadnych zmian.

## Krok 2 — Stwórz i wystrzel event

Dziś nie ma eventu dla "rola członka się zmieniła" — jest tylko linia w `ActivityLog`. Dodaj go, trzymając się tych samych konwencji co każdy inny event w `app/Events/` (zobacz
[`../integrations/03-add-a-new-event-type.md`](../integrations/03-add-a-new-event-type.md)
po pełne uzasadnienie tych konwencji — `final class`, `Dispatchable`, zwykłe niemutowalne dane, brak logiki):

Nowy plik: `app/Events/MemberRoleChanged.php`

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

Plik: `app/Services/ProjectMemberService.php`, `updateRole()` — wystrzel go **bezwarunkowo** za każdym razem, gdy rola faktycznie się zmienia, ta sama zasada, o której mówi `../integrations/03-add-a-new-event-type.md` dla każdego eventu:

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

Dodaj `use App\Events\MemberRoleChanged;` do importów tego pliku. `auth()->user()` jako aktor odpowiada konwencji już używanej przez `IssueService::createIssue()` (`event(new IssueCreated($issue, auth()->user()))`) — serwisy odczytują użytkownika wykonującego akcję z kontekstu autoryzacji, zamiast przyjmować go jako parametr.

## Krok 3 — Zarejestruj go i obsłuż w `SendNotificationListener`

Plik: `app/Providers/AppServiceProvider.php`, `boot()` — ten event dotyczy zarządzania rolami, nie aktywności issues/komentarzy, więc jest zarejestrowany tylko dla `SendNotificationListener`, **nie** dla `NotifyProjectIntegrationsListener` (to ta sama decyzja "decyduj niezależnie per listener", którą omawia
[`../integrations/03-add-a-new-event-type.md`](../integrations/03-add-a-new-event-type.md)
w kroku 3):

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

Dodaj `use App\Events\MemberRoleChanged;` do importów tego pliku.

Plik: `app/Listeners/SendNotificationListener.php`:

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

Dodaj `use App\Events\MemberRoleChanged;` też do tego pliku. Zabezpieczenie actor/member odzwierciedla wzorzec "nie powiadamiaj kogoś o jego własnej akcji" z `handleCommentAdded()` — istotne tutaj, bo nic dziś nie powstrzymuje Ownera/Admina przed zmianą własnego wiersza tą samą ścieżką kodu w przyszłym refaktorze.

## Krok 4 — Zdecyduj o domyślnym dostarczaniu (nie ma nic do skonfigurowania)

Nie ma tu żadnej domyślnej wartości per typ do ustawienia — każdy `NotificationType` startuje z tym, co mówi `NotificationChannel::enabledByDefault()` (`InApp` włączony, `Email` wyłączony), dopóki użytkownik nie nadpisze tego dla konkretnego typu. `MemberRoleChanged` dostaje dokładnie ten sam punkt startowy co każdy inny typ, za darmo.

## Krok 5 — Dodaj wiersz w ustawieniach na froncie (nie pomijaj tego)

Plik: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsNotificationsTab.tsx`

Dodaj wpis do `defaultNotificationTypes`:

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

`inApp: true, email: false` to tutaj tylko własne wartości zapasowe tej tablicy, odczytywane zanim nadejdą z backendu prawdziwe ustawienia per użytkownik (`mergeNotificationSettings()`) — trzymaj je w zgodzie z `NotificationChannel::enabledByDefault()` z kroku 4, żeby przełącznik nie mrugnął złym stanem przy pierwszym renderze. `icon` to dowolna nazwa ikony `lucide-react` (zobacz istniejące wpisy po ikony już w użyciu) — wybierz taką, która nie reprezentuje już koncepcyjnie innego typu.

Bez tego kroku `MemberRoleChanged` jest w pełni funkcjonalny na backendzie — powiadomienia się wysyłają, ustawienie jest w pełni odczytywalne/zapisywalne przez API — ale żaden członek nigdy nie zobaczy ani nie zmieni swojej preferencji dla niego, ponieważ `mergeNotificationSettings()` iteruje wyłącznie po `defaultNotificationTypes`, nigdy po surowym obiekcie ustawień z backendu.

## Krok 6 — Testy

- `tests/Feature/ProjectMemberServiceTest.php` — dodaj
  `'it fires MemberRoleChanged when a member's role changes'`,
  z `Event::fake()`, wywołując najpierw `$this->actingAs($admin)`, żeby `auth()->user()` rozwiązywał się do prawdziwego aktora:
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
- `tests/Feature/SendNotificationListenerTest.php` — na wzór kształtu testów Mockery dla `ProjectInvited`:
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
  — istniejący test `'renders each notification type with its in-app and email toggles'` asercuje dokładną liczbę/listę wierszy; zaktualizuj go, żeby uwzględniał `member_role_changed`, i dodaj przypadek na wzór `'hydrates toggles from the notificationSettings prop'` dla nowego id, jeśli chcesz potwierdzić, że merge go podchwytuje.
- `tests/Feature/NotificationSettingControllerTest.php` — bez zmian; test `'updating notification settings rejects an unknown notification type'` już pokrywa generyczną listę dozwolonych wartości `NotificationType::cases()`, która teraz automatycznie zawiera `MemberRoleChanged`, odkąd istnieje krok 1.
