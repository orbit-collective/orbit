# Dodaj nowy typ eventu

Przećwiczony przykład: dodanie `IssueCreated` — rodzaju aktywności, który **jeszcze nie istnieje**. Dziś stworzenie issue odpala tylko `IssueAssigned`, i to tylko jeśli zostało stworzone z przypisaną osobą inną niż twórca (zobacz `IssueService::createIssue()`). Nie ma w ogóle eventu dla "issue zostało stworzone" jako faktu samego w sobie. Ten przewodnik dodaje go od początku do końca: odpalany z właściwego miejsca, konsumowany zarówno przez listener powiadomień w aplikacji, jak i listener integracji, renderowany jako nowy embed na Discordzie.

## Jedna zasada, która ma tu największe znaczenie

**Event musi odpalać się zawsze, gdy fakt, który opisuje, jest prawdziwy — nigdy warunkowo w zależności od tego, kto mógłby się nim przejmować.** "Czy przypisana osoba powinna zostać powiadomiona o tym" albo "czy to powinno trafić na Discorda" to decyzje po stronie listenera, nie po stronie odpalania eventu.

To repozytorium miało już prawdziwy błąd wynikający z odwrócenia tej zasady: `CommentService::addComment()` odpalało kiedyś `CommentAdded` tylko wtedy, gdy issue miało przypisaną osobę *i* komentujący nią nie był — reguła sensowna dla "nie powiadamiaj kogoś o jego własnym komentarzu", ale po cichu zabijająca też webhook na Discorda dla dokładnie tych samych komentarzy, ponieważ `NotifyProjectIntegrationsListener` nasłuchuje tego samego eventu i nie miał sposobu, żeby odróżnić "to się nie wydarzyło" od "to się wydarzyło, ale emiter zdecydował, że nie musisz o tym wiedzieć". Poprawka przeniosła to filtrowanie do `SendNotificationListener::handleCommentAdded()`, a `CommentAdded` teraz zawsze się odpala. Nie powtarzaj tego błędu przy nowym evencie.

## Krok 1 — Stwórz klasę eventu

Nowy plik: `app/Events/IssueCreated.php`

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

Konwencje do zachowania (zobacz każdą istniejącą klasę w `app/Events/` po więcej przykładów):
- `final class`, `use Dispatchable;` (pozwala wywołać `IssueCreated::dispatch(...)` jako alternatywę dla globalnej funkcji `event(new IssueCreated(...))` — obie działają identycznie; to repozytorium używa globalnej funkcji w każdym miejscu wywołania).
- Właściwości promowane w konstruktorze jako `public readonly` — event jest zwykłym, niemutowalnym nośnikiem danych. **Nie wykonuje żadnej pracy** — żadnej logiki powiadomień, żadnych zapisów do bazy, nic warunkowego.
- Przenoś surowe dane, jakich mógłby potrzebować konsument do zbudowania własnej wiadomości (model `Issue`, działającego `User` albo `null`) — nie gotowe stringi. Zbudowanie właściwego tytułu/opisu/embedu to zadanie każdego listenera z osobna (zobacz kroki 3–5), więc dwaj różni konsumenci mogą opisać ten sam fakt zupełnie inaczej.

## Krok 2 — Odpal go z właściwego miejsca

Plik: `app/Services/IssueService.php`, `createIssue()`:

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

Zwróć uwagę, że odpala się to **bezwarunkowo** — każde stworzone issue dostaje event `IssueCreated`, niezależnie od tego, czy ma przypisaną osobę, niezależnie od tego, czy twórca przypisał je samemu sobie. Istniejące zabezpieczenie `IssueAssigned` tuż poniżej można spokojnie zostawić bez zmian: ten warunek ("nie odpalaj 'przypisano cię' gdy przypisałeś to sobie sam") dotyczy tego, że *`IssueAssigned` konkretnie nie ma sensu w tym przypadku* — nie filtruje `IssueCreated`, a `IssueCreated` już pokrywa "issue teraz istnieje" niezależnie od tego, jak wypadnie przypisanie z kroku 2. Nie dodawaj nowego eventu tylko wewnątrz tego `if` — byłby to dokładnie ten sam błąd, co stary błąd z `CommentAdded`, tylko dla innego eventu.

Dodaj `use App\Events\IssueCreated;` na górze pliku, obok istniejących importów `App\Events\*`.

## Krok 3 — Zarejestruj go dla listenera(ów), które powinny reagować

Plik: `app/Providers/AppServiceProvider.php`, `boot()`

Decydujesz **niezależnie dla każdego listenera**, czy powinien widzieć ten event — zarejestrowanie go dla jednego nie implikuje drugiego:

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

Jeśli *chcesz* też powiadomienia w aplikacji (np. "powiadom wszystkich członków projektu, gdy powstanie nowe issue" — dziś niezaimplementowane), dodaj `IssueCreated::class` też do listy `SendNotificationListener` i daj temu listenerowi nowy przypadek `handleIssueCreated()` (krok 4). Oba listenery są całkowicie niezależnymi konsumentami tego samego eventu — listener zarejestrowany dla eventu, dla którego nie ma przypadku `match`, po prostu trafia w `default => null` i bezpiecznie nic nie robi.

## Krok 4 — (opcjonalnie) obsłuż go w `SendNotificationListener`

Rób to tylko wtedy, gdy jest faktyczne powiadomienie do wysłania. Wzorzec do naśladowania, w `app/Listeners/SendNotificationListener.php`:

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

## Krok 5 — Obsłuż go w `NotifyProjectIntegrationsListener` + notifierach

Plik: `app/Listeners/NotifyProjectIntegrationsListener.php`, `resolveContext()`:

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

To jedyna zmiana potrzebna w tym listenerze — pozostaje całkowicie generyczny. Nie wie ani go nie obchodzi, że `IssueCreated` jest nowy; musi tylko wiedzieć, do jakiej kategorii pod-opcji należy event, a `$event->issue->project` jest dostępne w ten sam sposób, co przy każdym innym evencie związanym z issue.

Plik: `app/Services/Integrations/DiscordIntegrationNotifier.php` — dodaj gałąź `match` i budowniczego embedu:

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

Każda istniejąca metoda `*Embed()` ma ten sam trzyczęściowy kształt: zbuduj **tytuł** (z emoji + `#id action`), **opis** (pogrubione imiona, cytowany tytuł issue, kto to zrobił) i wykorzystaj ponownie `baseEmbed()` do standardowej części (`url`, `timestamp`, `footer`) — skopiuj ten kształt dokładnie dla nowego rodzaju eventu, żeby każdy embed czytał się spójnie na Discordzie.

Jeśli dodajesz *drugą* integrację (zobacz przewodnik 1), powtórz ten krok też w jej notifierze (np. `SlackIntegrationNotifier`) — każdy notifier niezależnie decyduje, które rodzaje eventów renderuje; nie ma jednego, wspólnego rejestru "jakie eventy istnieją" do aktualizowania poza gałęziami `match` w każdej klasie notifiera.

## Krok 6 — Testy

Cztery miejsca, dokładnie odzwierciedlające, jak pokryte są `IssueAssigned`/`CommentAdded`:

**`tests/Feature/IssueServiceTest.php`** — asertuj, że event się odpala:
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

**`tests/Feature/DiscordIntegrationNotifierTest.php`** — jeden test embedu plus test "brak aktora → nic nie zostaje zakolejkowane", kopiujący dokładnie kształty testów `issueAssignedEmbed`/`issueUpdatedEmbed`:
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

**`tests/Feature/NotifyProjectIntegrationsListenerTest.php`** — potwierdź, że `IssueCreated` przechodzi przez kategorię `issue-activity` dokładnie tak jak pozostałe trzy eventy związane z issue (skopiuj test `'it notifies an enabled discord integration opted into issue activity'`, podmień event).

**`tests/Feature/DiscordWebhookIntegrationEndToEndTest.php`** — prawdziwy łapacz regresji: wywołaj `IssueService::createIssue()` przez kontener (nie sam event bezpośrednio) ze skonfigurowaną, włączoną integracją i asertuj, że `SendWebhookNotificationJob` zostało wypchnięte do kolejki. To właśnie złapałoby oryginalny błąd z `CommentAdded` od razu — zawsze dodawaj coś takiego dla nowego eventu, nie tylko testy jednostkowe listenera/notifiera.
