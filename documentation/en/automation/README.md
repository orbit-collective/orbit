# Workspace Automation

A minimal, genuinely reusable "if this, then that" rule engine
(v0.9.4), configured per project at **Settings → Automation**. A rule
has one trigger, an optional flat list of AND-combined conditions, and
one or more ordered actions. It exists so that a project can react to
things happening in Orbit (or things GitHub reports back) without
Orbit hardcoding any particular policy — e.g. "when a GitHub pull
request is merged, move the linked issue to Done" is a rule a project
configures, not a built-in behavior.

## Guides, in the order you'd actually need them

1. **[Add a new trigger type](./01-add-a-new-trigger-type.md)** —
   worked example wiring `IssueService`'s existing assignment flow into
   a new `IssueAssigned` trigger.
2. **[Add a new action type](./02-add-a-new-action-type.md)** — worked
   example adding a `SetDueDate` action that wraps the issue update
   flow the same way every other action does.

## The architecture in one paragraph

`automation_rules` (`project_id`, `name`, `trigger_type`, `conditions`
JSON, `enabled`) has many `automation_actions` (`type`, `params` JSON,
`sort_order`) — `App\Models\AutomationRule`/`AutomationAction`, plain
Eloquent, no polymorphism. `App\Repositories\AutomationRuleRepository::findEnabledForProjectAndTrigger()`
is the only read path a trigger call site needs.
`App\Services\Automation\AutomationDispatcher::dispatch(AutomationTriggerType $trigger, Issue $issue, array $context, string $idempotencyKey)`
is the single entry point every trigger source calls: it loads the
project's enabled rules for that trigger, evaluates each rule's
conditions against `$context` with `AutomationConditionEvaluator`
(flat AND, operators `equals`/`not_equals`/`contains`/`in`, `data_get()`
against dotted paths like `pullRequest.title` — no condition groups, no
OR, by design), and for each match, runs that rule's actions **in
`sort_order`** via `AutomationActionResolver::resolve()` →
`App\Services\Automation\Actions\*Action::handle(Issue $issue, array $params)`.
Every action handler wraps an **existing** Orbit mutation service
(`IssueService`, `LabelService`, …) — there is no bespoke automation-only
write path, so an automation-triggered change goes through the exact
same validation/side-effects (activity log, other listeners) as a
human making the same change by hand.

**Idempotency**, not a generic event-sourcing system:
`automation_rule_executions` has a unique constraint on
`(automation_rule_id, idempotency_key)`. `dispatch()`'s caller supplies
the key — for GitHub triggers it's the relay event's own id, so a
retried webhook delivery can never run a rule's actions twice. A
duplicate insert is caught and that rule is silently skipped, not
retried or logged as an error.

**Loop prevention** is a single static flag
(`AutomationDispatcher::$executing`), not depth tracking: while a
rule's actions are running, any trigger fired from *inside* one of
them (e.g. `ChangeStatusAction` calling `IssueService::updateIssue()`,
which itself fires `IssueStatusChanged`) is dropped at `dispatch()`'s
very first check, never queued or deferred. One level of suppression
is enough to make `A` triggering `B` triggering `A` impossible, because
the inner `dispatch()` call simply never runs its rules.

## Triggers today

`App\Enums\AutomationTriggerType`: `IssueStatusChanged` (fired from
`IssueService` on every status change — the trigger that proves this
engine isn't GitHub-only) and five GitHub ones
(`GithubPullRequestOpened`/`Reopened`/`Closed`/`Merged`/`Synchronized`,
fired from `GithubRelayEventProcessor` — see
[`../integrations/06-github-integration.md`](../integrations/06-github-integration.md)).
A GitHub trigger's context is built once by
`App\Services\Integrations\Github\GithubAutomationContextBuilder` — a
clean Orbit-domain array (`project`, `issue`, `repository`,
`pullRequest`), **never** the raw GitHub webhook payload — reused by
every GitHub call site so the context shape a condition can reference
never depends on which specific event fired it.

## Actions today

`App\Enums\AutomationActionType`: `ChangeStatus`, `ChangePriority`,
`AssignUser`, `AddLabel`, `RemoveLabel`, `SendNotification` — see
`app/Services/Automation/Actions/`. Every handler validates its own
`params` defensively (e.g. `ChangeStatusAction` confirms the target
`workflow_status_id` actually belongs to the issue's own issue type)
and simply returns (no exception, no partial side effect) rather than
throwing when a param is missing or invalid, since a misconfigured
rule shouldn't be able to crash whatever fired the trigger.

## Permissions and settings UI

Two permissions gate this like any other project resource (see
[`../permissions/01-add-a-new-permission.md`](../permissions/01-add-a-new-permission.md)):
`projects.automation.view` (member/viewer default) and
`projects.automation.update` (owner/admin, checked via
`ProjectPolicy::updateAutomation()`). `App\Http\Controllers\AutomationController`
is a thin CRUD controller (`store`/`update`/`destroy`) delegating to
`AutomationRuleService`; `SettingsController::automation()` maps the
enum cases to `{value, label}` pairs for the rule builder's dropdowns.
The frontend (`Pages/Settings/Automation.tsx`,
`WorkspaceSettingsAutomationTab.tsx`) is deliberately minimal: a
compact rule list plus an inline add-rule form — one trigger, one
optional condition, one action per rule. It is not a visual
if/then/else builder with branches or condition groups; extending it
to one is out of scope for this release.
