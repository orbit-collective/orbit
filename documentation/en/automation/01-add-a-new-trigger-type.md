# Add a new trigger type

Worked example: firing a new `IssueAssigned` **automation** trigger
(distinct from the existing `App\Events\IssueAssigned` domain event,
which drives notifications, not rules) whenever `IssueService::updateIssue()`
changes an issue's `assignee_id` — mirroring exactly how
`IssueStatusChanged` already fires from the same method.

## 1. Add the enum case

`app/Enums/AutomationTriggerType.php`:

```php
enum AutomationTriggerType: string
{
    case IssueStatusChanged = 'issue.status_changed';
    case IssueAssigned = 'issue.assigned'; // new

    case GithubPullRequestOpened = 'github.pull_request.opened';
    // ...

    public function label(): string
    {
        return match ($this) {
            self::IssueStatusChanged => 'Issue status changed',
            self::IssueAssigned => 'Issue assigned', // new
            // ...
        };
    }
}
```

## 2. Fire it from where the change actually happens

`IssueService::updateIssue()` already computes `$changes` (a diff of
before/after) and already fires `IssueStatusChanged` when
`$changes['status']` is set. Add a sibling check for
`$changes['assignee_id']` in the same place:

```php
// app/Services/IssueService.php, inside updateIssue(), right after
// the existing IssueStatusChanged dispatch:
if (isset($changes['assignee_id'])) {
    $this->automationDispatcher->dispatch(
        AutomationTriggerType::IssueAssigned,
        $issue,
        ['issue' => ['id' => $issue->id, 'assigneeId' => $changes['assignee_id']['new']]],
        (string) Str::uuid(),
    );
}
```

A fresh `Str::uuid()` per call is correct here (not the relay event id
pattern GitHub triggers use) — an in-app update has no natural
"delivery id" to dedupe by, and `updateIssue()` itself already isn't
called twice for the same logical change.

**Context shape.** Keep it a small, clean array of only what a
condition or action might reasonably need — never the full `Issue`
model, and never internal/sensitive fields. `AutomationConditionEvaluator`
reads it with `data_get()` against dotted paths (e.g. `issue.assigneeId`),
so nesting is fine.

## 3. Test it

`tests/Feature/Automation/AutomationDispatcherTest.php` already has
the pattern to copy — construct a rule with
`trigger_type: AutomationTriggerType::IssueAssigned->value`, an action,
call `IssueService::updateIssue()` with a new `assignee_id`, and assert
the action ran (e.g. the issue's resulting state) exactly once. Also
add a negative test: updating an issue **without** changing the
assignee never dispatches the trigger.

## What you get automatically

- The Settings → Automation rule builder's trigger dropdown
  (`SettingsController::mapAutomationTriggerTypes()`) picks up the new
  case and its `label()` with no further frontend change.
- Idempotency (`automation_rule_executions`) and loop prevention
  (`AutomationDispatcher::$executing`) apply to this trigger exactly
  like every other one — nothing to opt into.

## What you don't need to do

- No new action types — a trigger only decides *when* rules run, not
  what they can do. Reuse the existing action catalog
  (`App\Enums\AutomationActionType`) unless the automation you're
  building genuinely needs a new kind of mutation (see
  [Add a new action type](./02-add-a-new-action-type.md)).
- No changes to `AutomationDispatcher`, `AutomationConditionEvaluator`,
  or the `automation_rules`/`automation_actions` schema — a new trigger
  is purely a new enum case plus one call site.
