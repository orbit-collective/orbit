<?php

namespace App\Services\Automation;

/**
 * Evaluates a rule's flat, AND-combined condition list against a trigger's
 * context array. No condition groups, no OR - kept intentionally minimal
 * (see documentation/en/automation for the full contract). A rule with no
 * conditions always matches.
 */
class AutomationConditionEvaluator
{
    /**
     * @param  array<int, array{field: string, operator: string, value: mixed}>  $conditions
     */
    public function matches(array $conditions, array $context): bool
    {
        foreach ($conditions as $condition) {
            if (! $this->conditionMatches($condition, $context)) {
                return false;
            }
        }

        return true;
    }

    private function conditionMatches(array $condition, array $context): bool
    {
        $actual = data_get($context, $condition['field'] ?? '');
        $expected = $condition['value'] ?? null;

        return match ($condition['operator'] ?? 'equals') {
            'equals' => $actual == $expected,
            'not_equals' => $actual != $expected,
            'contains' => is_string($actual) && is_string($expected) && str_contains($actual, $expected),
            'in' => is_array($expected) && in_array($actual, $expected, false),
            default => false,
        };
    }
}
