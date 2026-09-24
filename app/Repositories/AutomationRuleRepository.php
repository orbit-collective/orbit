<?php

namespace App\Repositories;

use App\Enums\AutomationTriggerType;
use App\Models\AutomationRule;
use App\Models\Project;
use Illuminate\Database\Eloquent\Collection;

class AutomationRuleRepository
{
    public function findEnabledForProjectAndTrigger(Project $project, AutomationTriggerType $trigger): Collection
    {
        return $project->automationRules()
            ->where('trigger_type', $trigger->value)
            ->where('enabled', true)
            ->with('actions')
            ->get();
    }

    public function getForProject(Project $project): Collection
    {
        return $project->automationRules()->with('actions')->latest()->get();
    }

    public function create(Project $project, array $data): AutomationRule
    {
        return $project->automationRules()->create($data);
    }

    public function update(AutomationRule $rule, array $data): AutomationRule
    {
        $rule->update($data);

        return $rule;
    }

    public function delete(AutomationRule $rule): void
    {
        $rule->delete();
    }
}
