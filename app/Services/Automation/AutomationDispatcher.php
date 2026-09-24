<?php

namespace App\Services\Automation;

use App\Enums\AutomationActionType;
use App\Enums\AutomationTriggerType;
use App\Models\AutomationRule;
use App\Models\AutomationRuleExecution;
use App\Models\Issue;
use App\Repositories\AutomationRuleRepository;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Log;

/**
 * Fires a trigger for one issue: finds every enabled rule matching the
 * trigger on the issue's project, evaluates its conditions against the
 * given context, and runs its actions in order - exactly once per
 * (rule, idempotency key), no matter how many times dispatch() is called
 * with the same key (e.g. a retried relay event). See
 * AutomationRuleExecution for the guard itself.
 */
class AutomationDispatcher
{
    /**
     * Set for the duration of an action's own execution. A trigger fired by
     * app code from inside an automation action (e.g. ChangeStatusAction
     * calling IssueService::updateIssue(), which could itself fire
     * IssueStatusChanged) is dropped rather than dispatched again - the
     * loop-prevention this codebase doesn't have yet otherwise. Depth is not
     * tracked because it doesn't need to be: one level of suppression is
     * enough to make A-triggers-B-triggers-A impossible, since the inner
     * dispatch() call simply never runs.
     */
    private static bool $executing = false;

    public function __construct(
        protected AutomationRuleRepository $ruleRepository,
        protected AutomationConditionEvaluator $conditionEvaluator,
        protected AutomationActionResolver $actionResolver,
    ) {}

    /**
     * @param  array<string, mixed>  $context
     */
    public function dispatch(AutomationTriggerType $trigger, Issue $issue, array $context, string $idempotencyKey): void
    {
        if (self::$executing) {
            Log::info('Ignoring a trigger fired from inside an automation action', [
                'issueId' => $issue->id,
                'trigger' => $trigger->value,
            ]);

            return;
        }

        $rules = $this->ruleRepository->findEnabledForProjectAndTrigger($issue->project, $trigger);

        self::$executing = true;

        try {
            foreach ($rules as $rule) {
                if (! $this->conditionEvaluator->matches($rule->conditions ?? [], $context)) {
                    continue;
                }

                if (! $this->claimExecution($rule, $idempotencyKey)) {
                    continue;
                }

                foreach ($rule->actions as $action) {
                    $this->actionResolver
                        ->resolve(AutomationActionType::from($action->type))
                        ->handle($issue, $action->params ?? []);
                }

                Log::info('Automation rule executed', [
                    'automationRuleId' => $rule->id,
                    'issueId' => $issue->id,
                    'trigger' => $trigger->value,
                ]);
            }
        } finally {
            self::$executing = false;
        }
    }

    /**
     * Inserts the execution guard row and returns whether this call won the
     * race to do so - false means another call (or a previous delivery of
     * the same event) already ran this rule for this idempotency key.
     */
    private function claimExecution(AutomationRule $rule, string $idempotencyKey): bool
    {
        if (
            AutomationRuleExecution::query()
                ->where('automation_rule_id', $rule->id)
                ->where('idempotency_key', $idempotencyKey)
                ->exists()
        ) {
            return false;
        }

        try {
            AutomationRuleExecution::query()->create([
                'automation_rule_id' => $rule->id,
                'idempotency_key' => $idempotencyKey,
                'executed_at' => now(),
            ]);
        } catch (QueryException) {
            return false;
        }

        return true;
    }
}
