<?php

namespace App\Services\Automation;

use App\Models\AutomationRule;
use App\Models\Project;
use App\Repositories\AutomationRuleRepository;
use Illuminate\Database\Eloquent\Collection;

class AutomationRuleService
{
    public function __construct(
        protected AutomationRuleRepository $ruleRepository,
    ) {}

    public function getForProject(Project $project): Collection
    {
        return $this->ruleRepository->getForProject($project);
    }

    /**
     * @param  array{name: string, trigger_type: string, conditions?: array, enabled?: bool, actions: array<int, array{type: string, params?: array}>}  $data
     */
    public function create(Project $project, array $data): AutomationRule
    {
        $rule = $this->ruleRepository->create($project, [
            'name' => $data['name'],
            'trigger_type' => $data['trigger_type'],
            'conditions' => $data['conditions'] ?? [],
            'enabled' => $data['enabled'] ?? true,
        ]);

        $this->syncActions($rule, $data['actions']);

        return $rule;
    }

    public function update(AutomationRule $rule, array $data): AutomationRule
    {
        $this->ruleRepository->update($rule, [
            'name' => $data['name'],
            'trigger_type' => $data['trigger_type'],
            'conditions' => $data['conditions'] ?? [],
            'enabled' => $data['enabled'] ?? $rule->enabled,
        ]);

        if (isset($data['actions'])) {
            $this->syncActions($rule, $data['actions']);
        }

        return $rule;
    }

    public function delete(AutomationRule $rule): void
    {
        $this->ruleRepository->delete($rule);
    }

    /**
     * @param  array<int, array{type: string, params?: array}>  $actions
     */
    private function syncActions(AutomationRule $rule, array $actions): void
    {
        $rule->actions()->delete();

        foreach (array_values($actions) as $index => $action) {
            $rule->actions()->create([
                'type' => $action['type'],
                'params' => $action['params'] ?? [],
                'sort_order' => $index,
            ]);
        }
    }
}
