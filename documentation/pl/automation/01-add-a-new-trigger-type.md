# Dodaj nowy typ triggera

Przykład na żywym kodzie: wyzwolenie nowego triggera **automatyzacji**
`IssueAssigned` (odrębnego od istniejącego eventu domenowego
`App\Events\IssueAssigned`, który napędza powiadomienia, a nie reguły)
za każdym razem, gdy `IssueService::updateIssue()` zmienia
`assignee_id` issue — dokładnie tak samo, jak już dziś wyzwala się
`IssueStatusChanged` z tej samej metody.

## 1. Dodaj case enuma

`app/Enums/AutomationTriggerType.php`:

```php
enum AutomationTriggerType: string
{
    case IssueStatusChanged = 'issue.status_changed';
    case IssueAssigned = 'issue.assigned'; // nowy

    case GithubPullRequestOpened = 'github.pull_request.opened';
    // ...

    public function label(): string
    {
        return match ($this) {
            self::IssueStatusChanged => 'Issue status changed',
            self::IssueAssigned => 'Issue assigned', // nowy
            // ...
        };
    }
}
```

## 2. Wyzwól go tam, gdzie zmiana faktycznie się dzieje

`IssueService::updateIssue()` już oblicza `$changes` (diff
przed/po) i już wyzwala `IssueStatusChanged`, gdy ustawione jest
`$changes['status']`. Dodaj analogiczne sprawdzenie dla
`$changes['assignee_id']` w tym samym miejscu:

```php
// app/Services/IssueService.php, wewnątrz updateIssue(), zaraz po
// istniejącym wywołaniu dispatch dla IssueStatusChanged:
if (isset($changes['assignee_id'])) {
    $this->automationDispatcher->dispatch(
        AutomationTriggerType::IssueAssigned,
        $issue,
        ['issue' => ['id' => $issue->id, 'assigneeId' => $changes['assignee_id']['new']]],
        (string) Str::uuid(),
    );
}
```

Świeży `Str::uuid()` na każde wywołanie jest tu prawidłowy (nie wzorzec
z id eventu relay, jakiego używają triggery z GitHuba) — aktualizacja
wewnątrz aplikacji nie ma naturalnego "id dostawy" do deduplikacji, a
sam `updateIssue()` i tak nie jest wywoływany dwukrotnie dla tej samej
logicznej zmiany.

**Kształt kontekstu.** Utrzymuj go jako małą, czystą tablicę zawierającą
wyłącznie to, czego rozsądnie może potrzebować warunek albo akcja —
nigdy pełny model `Issue`, i nigdy pola wewnętrzne/wrażliwe.
`AutomationConditionEvaluator` czyta go przez `data_get()` po
kropkowanych ścieżkach (np. `issue.assigneeId`), więc zagnieżdżenie
jest w porządku.

## 3. Przetestuj to

`tests/Feature/Automation/AutomationDispatcherTest.php` ma już wzorzec
do skopiowania — zbuduj regułę z
`trigger_type: AutomationTriggerType::IssueAssigned->value`, akcją,
wywołaj `IssueService::updateIssue()` z nowym `assignee_id` i sprawdź,
że akcja uruchomiła się dokładnie raz (np. przez wynikowy stan issue).
Dodaj też test negatywny: aktualizacja issue **bez** zmiany
przypisanej osoby nigdy nie wyzwala triggera.

## Co dostajesz automatycznie

- Dropdown triggerów w builderze reguł w Ustawienia → Automation
  (`SettingsController::mapAutomationTriggerTypes()`) podłapuje nowy
  case i jego `label()` bez żadnej dalszej zmiany na frontendzie.
- Idempotencja (`automation_rule_executions`) i zapobieganie pętlom
  (`AutomationDispatcher::$executing`) działają dla tego triggera
  dokładnie tak samo jak dla każdego innego — nie ma w co się włączać.

## Czego nie musisz robić

- Żadnych nowych typów akcji — trigger decyduje wyłącznie o tym, *kiedy*
  reguły się uruchamiają, nie co mogą zrobić. Reużyj istniejący katalog
  akcji (`App\Enums\AutomationActionType`), chyba że budowana
  automatyzacja naprawdę potrzebuje nowego rodzaju mutacji (zobacz
  [Dodaj nowy typ akcji](./02-add-a-new-action-type.md)).
- Żadnych zmian w `AutomationDispatcher`, `AutomationConditionEvaluator`
  ani w schemacie `automation_rules`/`automation_actions` — nowy
  trigger to wyłącznie nowy case enuma plus jedno miejsce wywołania.
