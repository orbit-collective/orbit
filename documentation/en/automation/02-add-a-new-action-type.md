# Add a new action type

Worked example: a `SetDueDate` action that sets an issue's `end_date`
to N days from when the rule fires — wrapping the exact same
`IssueService::updateIssue()` every other issue mutation (human or
automated) already goes through.

## 1. Add the enum case

`app/Enums/AutomationActionType.php`:

```php
enum AutomationActionType: string
{
    case ChangeStatus = 'change_status';
    // ...
    case SetDueDate = 'set_due_date'; // new

    public function label(): string
    {
        return match ($this) {
            self::ChangeStatus => 'Change status',
            // ...
            self::SetDueDate => 'Set due date', // new
        };
    }
}
```

## 2. Write the handler

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

Every handler wraps an **existing** service method — never write to
`Issue` (or any model) directly from an action. That's what keeps an
automated change indistinguishable, at every downstream layer (activity
log, notifications, other listeners), from a human making the same
edit by hand.

## 3. Register it in the resolver

`app/Services/Automation/AutomationActionResolver.php`:

```php
public function resolve(AutomationActionType $type): AutomationActionHandler
{
    $class = match ($type) {
        AutomationActionType::ChangeStatus => ChangeStatusAction::class,
        // ...
        AutomationActionType::SetDueDate => SetDueDateAction::class, // new
    };

    return $this->container->make($class);
}
```

## 4. Validate its params where rules are saved

`AutomationController::validateRule()` validates every action's
`type`/`params` generically (`params` is just `array`) — a
type-specific shape like `days_from_now` is the handler's own concern,
validated defensively inside `handle()` as shown above, not added to
the controller's validation rules. This matches every existing action
(e.g. `ChangeStatusAction` checking `workflow_status_id` belongs to the
issue's own issue type) rather than growing the controller with one
special case per action type.

## 5. Test it

Copy the pattern from an existing action test (e.g.
`tests/Feature/Automation/AutomationActionsTest.php`): construct the
issue and params, call `app(SetDueDateAction::class)->handle($issue, $params)`
directly (no need to go through the dispatcher for a handler-level
test), and assert `$issue->fresh()->end_date`. Also cover the
no-op paths: a missing `days_from_now` and a negative one must never
throw and must never touch `end_date`.

## What you get automatically

- The rule builder's action dropdown
  (`SettingsController::mapAutomationActionTypes()`) picks up the new
  case and its `label()`.
- Ordering (`sort_order`), idempotency, and loop prevention are all
  handled by `AutomationDispatcher` — a new action type never touches
  any of that.
