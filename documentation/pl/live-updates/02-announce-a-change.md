# Ogłoś zmianę

Klienci na żywo dowiadują się o zapisie tylko wtedy, gdy zapis o sobie powie. Są trzy sposoby, od najbardziej do najmniej automatycznego. Przerobiony przykład dodaje aktualizacje na żywo dla hipotetycznego modelu `Milestone`, który należy do projektu.

## Najważniejsza zasada

**Zdarzenie niesie identyfikatory i rodzaje zmian, ale nigdy nie zawiera zawartości rekordów.** `ProjectChanged` to `{changes: [{type, id, action}], actor}`. Klient używa go wyłącznie do ustalenia, które propsy Inertia pobrać ponownie, a to pobranie idzie zwykłymi, autoryzowanymi trasami. Właśnie to czyni kanał bezpiecznym: klient, który nadal jest zasubskrybowany po utracie dostępu (otwarta karta usuniętego członka), dostaje podpowiedzi o rzeczach, których nie może już pobrać. Jedynym wyjątkiem jest zdarzenie `NotificationsChanged`, które niesie nowe powiadomienie — ale podróżuje prywatnym kanałem samego adresata.

## Krok 1 — Modele: użyj traita

Plik: `app/Models/Concerns/BroadcastsLiveChanges.php`

```php
trait BroadcastsLiveChanges
{
    protected static function bootBroadcastsLiveChanges(): void
    {
        static::created(fn ($model) => $model->broadcastLive('created'));
        static::updated(fn ($model) => $model->broadcastLive('updated'));
        static::deleted(fn ($model) => $model->broadcastLive('deleted'));
    }

    /** @return array{project: int, type: string, id: int|null}|null */
    abstract protected function liveChange(): ?array;

    protected function broadcastLive(string $action): void
    {
        $live = app(LiveUpdates::class);

        if (! $live->enabled()) {
            return;
        }

        $change = $this->liveChange();

        if ($change !== null) {
            $live->project($change['project'], $change['type'], $change['id'], $action);
        }
    }
}
```

Plik: `app/Models/Milestone.php`

```php
class Milestone extends Model
{
    use BroadcastsLiveChanges;

    protected function liveChange(): ?array
    {
        return $this->project_id
            ? ['project' => $this->project_id, 'type' => 'milestones', 'id' => $this->id]
            : null;
    }
}
```

`type` to słowo, po którym przełącza się klient (Krok 3 w [Zareaguj na zmianę w UI](./03-react-to-a-change-in-the-ui.md)). `id` to rekord albo `null`, gdy zmiana nie dotyczy jednego rekordu. Istniejące modele: `Issue` (`issue`), `Comment` (`comment`, z id swojego zgłoszenia, bo komentarz jest wyświetlany przy zgłoszeniu), `Project`, `Label` (`labels`), `Priority` (`priorities`) i `IssueType` (`issue-types`).

## Krok 2 — Zapisy omijające zdarzenia modeli

Zapisy przez query builder (`->update()`, `->delete()` na zapytaniu, surowy SQL, `attach`/`detach` na pivocie) nie wywołują zdarzeń modeli — ta sama pułapka co wersje cache w [`../redis/02-cache-a-value-and-invalidate-it.md`](../redis/02-cache-a-value-and-invalidate-it.md). Wywołaj `LiveUpdates` tam, gdzie się dzieją, obok `CacheVersion::bump(...)`:

Plik: `app/Repositories/IssueRepository.php`

```php
    public function bulkDelete(array $ids): void
    {
        $projectIds = Issue::whereIn('id', $ids)->distinct()->pluck('project_id');

        Issue::whereIn('id', $ids)->delete();

        // A query-builder delete fires no model events.
        CacheVersion::bump(CacheVersion::ISSUES);

        foreach ($projectIds as $projectId) {
            app(LiveUpdates::class)->issue($projectId, null, 'bulk');
        }
    }
```

`LiveUpdates` oferuje `issue()`, `comment()`, `project($projectId, $type, $id, $action)`, `membership($projectId, $userId)` (członek dołączył, odszedł albo zmienił rolę: informuje projekt i tę osobę) oraz `access($userId, $projectId)`. Każda metoda jest pusta, gdy aktualizacje na żywo są wyłączone.

## Krok 3 — Kto i kiedy jest informowany

Plik: `app/Support/Live/LiveUpdates.php`

Nic nie jest wysyłane w chwili wywołania. Zmiany są zbierane per projekt, deduplikowane (to samo `type:id:action` raz) i wysyłane, gdy odpowiedź HTTP jest gotowa (`app->terminating`) albo zadanie w kolejce się zakończyło (`JobProcessed`, `JobFailed`, `JobExceptionOccurred`). Powyżej 25 zmian w jednym wysłaniu zwijają się w jeden wpis `bulk` na typ. Żądanie edytujące pięćdziesiąt zgłoszeń to więc jedno zdarzenie na projekt, a nic nie jest nadawane przed zatwierdzeniem transakcji, która zapisała dane (zdarzenia są `ShouldDispatchAfterCommit`).

Zdarzenia podróżują kolejką `live` (`LiveChannels::QUEUE`); worker czyta ją przed `default`.

## Krok 4 — Własny kanał użytkownika

Dwa zdarzenia trafiają na kanał `user.{id}` jednego użytkownika:

- `AccessChanged` — zmieniło się jego członkostwo lub rola; otwarte karty pobierają stronę ponownie. Wysyła je `LiveUpdates::membership()`.
- `NotificationsChanged` — zmieniła się jego skrzynka. **Każdy zapis powiadomień już przechodzi przez `NotificationService`**, którego `store()` ogłasza nowy wiersz, a `forget()` ogłasza całą resztę (odczyt, usunięcie, czyszczenie). Ścieżka, która *zmienia* istniejące powiadomienia, musi wywoływać `forget()` jak istniejące. Ścieżka, która *tworzy* powiadomienie, musi użyć `store()` (albo `notify()`, które je wywołuje), bo tylko `store()` dodaje utworzony wiersz do zdarzenia, z którego korzysta powiadomienie przeglądarki.

## Krok 5 — Testy

Wzorem do skopiowania jest plik `tests/Feature/Live/LiveUpdatesTest.php`:

```php
beforeEach(function () {
    config(['live.enabled' => true]);
    Event::fake([ProjectChanged::class, AccessChanged::class, NotificationsChanged::class]);
});

test('saving a milestone is announced to its project', function () {
    $project = Project::factory()->create();
    $milestone = Milestone::factory()->create(['project_id' => $project->id]);
    app(LiveUpdates::class)->flush();
    Event::fake([ProjectChanged::class]);

    $milestone->update(['title' => 'Renamed']);
    app(LiveUpdates::class)->flush();

    Event::assertDispatched(ProjectChanged::class, fn (ProjectChanged $event) => $event->projectId === $project->id
        && in_array(['type' => 'milestones', 'id' => $milestone->id, 'action' => 'updated'], $event->changes, true));
});
```

Wywołaj `flush()` samodzielnie w teście, który nie wykonuje żądania HTTP; test funkcjonalny, który je wykonuje (zobacz ostatni test w pliku), wysyła zmiany przy zakończeniu jak na produkcji.
