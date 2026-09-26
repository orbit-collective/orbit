<?php

namespace App\Services\Automation;

use App\Models\AutomationAction;
use App\Models\AutomationRule;
use App\Models\Project;
use App\Repositories\AutomationRuleRepository;
use App\Services\ActivityLogService;
use Illuminate\Database\Eloquent\Collection;

class AutomationRuleService
{
    public function __construct(
        protected AutomationRuleRepository $ruleRepository,
        protected ActivityLogService $activityLogService,
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

        $this->activityLogService->log($project->id, "Created the \"$rule->name\" automation rule");

        return $rule;
    }

    public function update(AutomationRule $rule, array $data): AutomationRule
    {
        $wasEnabled = $rule->enabled;
        $onlyToggled = $data['name'] === $rule->name
            && $data['trigger_type'] === $rule->trigger_type
            && ($data['conditions'] ?? []) == $rule->conditions
            && (! isset($data['actions']) || $this->actionsUnchanged($rule, $data['actions']))
            && isset($data['enabled'])
            && $data['enabled'] !== $wasEnabled;

        $this->ruleRepository->update($rule, [
            'name' => $data['name'],
            'trigger_type' => $data['trigger_type'],
            'conditions' => $data['conditions'] ?? [],
            'enabled' => $data['enabled'] ?? $rule->enabled,
        ]);

        if (isset($data['actions'])) {
            $this->syncActions($rule, $data['actions']);
        }

        $this->activityLogService->log(
            $rule->project_id,
            $onlyToggled
                ? ($data['enabled'] ? "Enabled the \"$rule->name\" automation rule" : "Disabled the \"$rule->name\" automation rule")
                : "Updated the \"$rule->name\" automation rule"
        );

        return $rule;
    }

    public function delete(AutomationRule $rule): void
    {
        $name = $rule->name;
        $projectId = $rule->project_id;

        $this->ruleRepository->delete($rule);

        $this->activityLogService->log($projectId, "Deleted the \"$name\" automation rule");
    }

    /**
     * Whether an incoming actions array is identical (type/params, in
     * order) to what the rule already has - used only to decide whether an
     * update() call is purely an enabled/disabled toggle, since the
     * controller's own validation always requires `actions` to be present,
     * so mere presence can't be used as that signal.
     *
     * @param  array<int, array{type: string, params?: array}>  $actions
     */
    private function actionsUnchanged(AutomationRule $rule, array $actions): bool
    {
        $current = $rule->actions()->get()
            ->map(fn (AutomationAction $action) => ['type' => $action->type, 'params' => $action->params])
            ->values()
            ->all();

        $incoming = array_map(
            fn (array $action) => ['type' => $action['type'], 'params' => $action['params'] ?? []],
            array_values($actions),
        );

        return $current == $incoming;
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
