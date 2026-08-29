# Wyślij powiadomienie z własnego kodu

Przewodnik 1 pokrywa podłączenie eventu domenowego przez `SendNotificationListener` do `NotificationService::notify()`. Nie zawsze potrzebujesz eventu pomiędzy — `notify()` to zwykła metoda serwisu, wywoływalna bezpośrednio z dowolnego miejsca, a przechodzenie przez event ma znaczenie tylko wtedy, gdy więcej niż jeden odbiorca musi zareagować na ten sam fakt (powiadomienia *i* integracje, na przykład). Przećwiczony przykład: przycisk "Przypomnij osobie przypisanej", który wysyła jednorazowe przypomnienie — celowa, jednorazowa akcja użytkownika z dokładnie jednym odbiorcą, więc wywołuje `notify()` bezpośrednio zamiast wprowadzać event, na który nikt inny nigdy nie będzie nasłuchiwał.

## Kontrakt `notify()`

Plik: `app/Services/NotificationService.php`

```php
public function notify(int $userId, NotificationType $notificationType, string $type, string $title, string $message, ?string $actionUrl = null): ?Notification
```

- **`$userId`** — odbiorca. Zawsze pojedynczy użytkownik; żeby powiadomić kilka osób, wywołaj `notify()` raz na odbiorcę (zobacz dwie osobne pętle w `SendNotificationListener::handleIssueUpdated()` dla aktora vs. osoby przypisanej).
- **`$notificationType`** — który `NotificationType` to jest. Właśnie po tym bramkuje ustawienie `NotificationSetting` odbiorcy per typ/per kanał — wybierz istniejący przypadek, jeśli powiadomienie jest wariantem czegoś, co już istnieje (tak jak w tym przewodniku, ponownie używającym `IssueUpdated`), albo najpierw dodaj nowy (przewodnik 1), jeśli zasługuje na własny przełącznik w ustawieniach konta.
- **`$type`** — **string ważności wizualnej UI**, `'success'|'info'|'warning'|'error'` (walidowany w `NotificationController::update()`). Jest niezwiązany z `$notificationType` i niekonfigurowalny przez użytkownika — wpływa tylko na to, jak powiadomienie w aplikacji może być ostylowane. Każde istniejące miejsce wywołania używa `'info'`.
- **`$title`** / **`$message`** — zwykły tekst, używany dosłownie zarówno jako tytuł/wiadomość powiadomienia w aplikacji, jak i temat/treść maila (`NotificationMailService::send()` przekazuje je wprost do `NotificationMail`). Nie ma osobnej treści per kanał — napisz jedną wiadomość, która dobrze czyta się w obu miejscach.
- **`$actionUrl`** — opcjonalny; renderuje się jako link "View details" w aplikacji (`NotificationItem.tsx`) oraz przycisk CTA w mailu (`resources/views/emails/notification.blade.php`). Każde istniejące miejsce wywołania buduje to przez `route(...)`, nigdy przez ręcznie sklejony string.
- **Wartość zwracana** — zapisany wiersz `Notification`, albo `null`, jeśli odbiorca ma wyłączone powiadomienia w aplikacji dla tego typu (mail mógł mimo to zostać wysłany — oba kanały są niezależne, zobacz poniżej).

## Co faktycznie dzieje się per kanał

`notify()` zawsze robi obie te rzeczy, bezwarunkowo, w tej kolejności:

1. **Mail**, przez `NotificationMailService::send()` — sprawdza ustawienie `NotificationChannel::Email` odbiorcy dla tego `$notificationType` (domyślnie: **wyłączony**, zobacz `NotificationChannel::enabledByDefault()`); jeśli włączony, kolejkuje `NotificationMail` (ograniczony rate-limitem, ponawiany do 5 razy przy przejściowych błędach SMTP — zobacz `NotificationMail::$tries`/`backoff()`). To **nie** jest bramkowane przez `MailConfigurationService` — ten serwis bramkuje tylko przepływ maila z zaproszeniem do projektu oraz prop Inertii `mailEnabled` używany gdzie indziej do pokazania banera "skonfiguruj mail". Każdy inny mail z powiadomieniem jest próbowany przez normalną konfigurację `mail.default` Laravela niezależnie od tego; jeśli to `log` lub `array`, "wysłanie" po prostu zapisuje do logu/tablicy w pamięci zamiast do skrzynki — nic nie zwraca błędu, więc nie zdziw się, że powiadomienia mailowe "działają" w każdym środowisku, choć w rzeczywistości nigdzie się nie dostarczają, dopóki nie skonfigurujesz prawdziwego mailera.
2. **W aplikacji**, tylko jeśli ustawienie `NotificationChannel::InApp` odbiorcy dla tego typu jest włączone (domyślnie: **włączony**) — zapisuje wiersz `Notification`. W przeciwnym razie całkowicie pomijane; dla wyłączonego kanału nigdy nie jest zapisywany żaden wiersz.

## Krok 1 — Wstrzyknij `NotificationService`

Plik: `app/Services/IssueService.php`

```php
public function __construct(
    protected IssueRepository $issueRepository,
    protected ActivityLogService $activityLogService,
    protected UserService $userService,
    protected NotificationService $notificationService,
) {}
```

Dodaj `use App\Services\NotificationService;` oraz `use App\Enums\Notifications\NotificationType;` do importów tego pliku.

## Krok 2 — Dodaj metodę w serwisie

Plik: `app/Services/IssueService.php`

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

Dodaj `use Illuminate\Validation\ValidationException;`, jeśli jeszcze nie jest zaimportowany. `NotificationType::IssueUpdated` jest tu ponownie użyty zamiast dodawania dedykowanego typu — ręczne przypomnienie jest wariantem "coś się zmieniło w issue, na którym Ci zależy" i nie potrzebuje własnego wiersza w ustawieniach konta, chyba że konkretnie chcesz, żeby był niezależnie przełączalny (w takim wypadku najpierw zrób przewodnik 1, a potem podmień tu typ).

## Krok 3 — Akcja w kontrolerze i trasa

Plik: `app/Http/Controllers/IssueController.php`

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

To ponownie wykorzystuje `IssuePolicy::update` — wysłanie przypomnienia jest zabezpieczone tak samo jak każda inna akcja zarządzania issue, nie warto tworzyć dla niego osobnego uprawnienia dla akcji o niskiej stawce, którą można łatwo powtórzyć.

Plik: `routes/web.php`, obok pozostałych tras `issues/{issue}`:

```php
Route::post('/projects/{project}/issues/{issue}/remind', [IssueController::class, 'remindAssignee'])->name('issues.remind');
```

## Krok 4 — Testy

- `tests/Feature/IssueServiceTest.php` — jego `beforeEach` konstruuje `IssueService` ręcznie; dodaj nową zależność:
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
  a następnie dodaj:
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
- `tests/Feature/IssueControllerTest.php` — dodaj test "an assignable member can remind the assignee" (asercuje przekierowanie + flash sukcesu) oraz "a member without issues.update access cannot remind the assignee" (na wzór istniejących testów zabezpieczonych przez `update`), a także "reminding through a mismatched project 404s", kopiując istniejący wzorzec z innych tras issue.
