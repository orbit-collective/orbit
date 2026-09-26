# Dodaj nowy typ akcji

Przykład na żywym kodzie: akcja `SetDueDate`, która ustawia
`end_date` issue na N dni od momentu wyzwolenia reguły — opakowując
dokładnie ten sam `IssueService::updateIssue()`, przez który przechodzi
już każda inna mutacja issue (ludzka czy zautomatyzowana).

## 1. Dodaj case enuma

`app/Enums/AutomationActionType.php`:

```php
enum AutomationActionType: string
{
    case ChangeStatus = 'change_status';
    // ...
    case SetDueDate = 'set_due_date'; // nowy

    public function label(): string
    {
        return match ($this) {
            self::ChangeStatus => 'Change status',
            // ...
            self::SetDueDate => 'Set due date', // nowy
        };
    }
}
```

## 2. Napisz handler

`app/Services/Automation/Actions/SetDueDateAction.php`:

```php
<?php

namespace App\Services\Automation\Actions;

use App\Models\Issue;
use App\Services\IssueService;
use Carbon\Carbon;

/**
 * params: {days_from_now: int} - a positive integer, validated when the
 * rule is saved (see AutomationController::validateRule()). Silently no-ops
 * on a missing/invalid param rather than throwing, same as every other
 * action handler - a misconfigured rule must never crash whatever fired
 * the trigger.
 */
class SetDueDateAction implements AutomationActionHandler
{
    public function __construct(
        protected IssueService $issueService,
    ) {}

    public function handle(Issue $issue, array $params): void
    {
        $daysFromNow = $params['days_from_now'] ?? null;

        if (! is_int($daysFromNow) || $daysFromNow < 0) {
            return;
        }

        $this->issueService->updateIssue($issue, [
            'end_date' => Carbon::now()->addDays($daysFromNow)->toDateString(),
        ]);
    }
}
```

Każdy handler opakowuje **istniejącą** metodę serwisu — nigdy nie
zapisuj do `Issue` (ani żadnego innego modelu) bezpośrednio z akcji. To
właśnie sprawia, że zautomatyzowana zmiana jest nieodróżnialna, na
każdej kolejnej warstwie (log aktywności, powiadomienia, inne
listenery), od tej samej edycji wykonanej ręcznie przez człowieka.

## 3. Zarejestruj ją w resolverze

`app/Services/Automation/AutomationActionResolver.php`:

```php
public function resolve(AutomationActionType $type): AutomationActionHandler
{
    $class = match ($type) {
        AutomationActionType::ChangeStatus => ChangeStatusAction::class,
        // ...
        AutomationActionType::SetDueDate => SetDueDateAction::class, // nowy
    };

    return $this->container->make($class);
}
```

## 4. Zwaliduj jej parametry tam, gdzie reguły są zapisywane

`AutomationController::validateRule()` waliduje `type`/`params` każdej
akcji generycznie (`params` to po prostu `array`) — kształt
specyficzny dla danego typu, jak `days_from_now`, to sprawa samego
handlera, walidowana defensywnie wewnątrz `handle()` jak pokazano
wyżej, a nie dodawana do reguł walidacji kontrolera. To odpowiada
każdej istniejącej akcji (np. `ChangeStatusAction` sprawdzający, że
`workflow_status_id` należy do typu issue, którego dotyczy), zamiast
rozrastać kontroler o jeden szczególny przypadek na typ akcji.

## 5. Przetestuj to

Skopiuj wzorzec z istniejącego testu akcji (np.
`tests/Feature/Automation/AutomationActionsTest.php`): zbuduj issue i
parametry, wywołaj `app(SetDueDateAction::class)->handle($issue, $params)`
bezpośrednio (nie ma potrzeby przechodzić przez dispatcher przy teście
na poziomie handlera) i sprawdź `$issue->fresh()->end_date`. Pokryj
też ścieżki no-op: brakujące `days_from_now` i ujemne nigdy nie mogą
rzucić wyjątku ani dotknąć `end_date`.

## Co dostajesz automatycznie

- Dropdown akcji w builderze reguł
  (`SettingsController::mapAutomationActionTypes()`) podłapuje nowy
  case i jego `label()`.
- Kolejność (`sort_order`), idempotencja i zapobieganie pętlom są
  obsługiwane przez `AutomationDispatcher` — nowy typ akcji nigdy nie
  dotyka niczego z tego.
