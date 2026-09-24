<?php

namespace App\Http\Controllers;

use App\Enums\AutomationActionType;
use App\Enums\AutomationTriggerType;
use App\Models\AutomationRule;
use App\Models\Project;
use App\Services\Automation\AutomationRuleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class AutomationController extends Controller
{
    public function __construct(
        protected AutomationRuleService $automationRuleService,
    ) {}

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('updateAutomation', $project);

        $validated = $this->validateRule($request);

        $this->automationRuleService->create($project, $validated);

        return redirect()->back()->with('success', "The \"{$validated['name']}\" automation rule has been created.");
    }

    public function update(Request $request, Project $project, AutomationRule $automationRule): RedirectResponse
    {
        $this->ensureRuleBelongsToProject($project, $automationRule);
        $this->authorize('updateAutomation', $project);

        $validated = $this->validateRule($request);

        $this->automationRuleService->update($automationRule, $validated);

        return redirect()->back()->with('success', "The \"{$validated['name']}\" automation rule has been updated.");
    }

    public function destroy(Project $project, AutomationRule $automationRule): RedirectResponse
    {
        $this->ensureRuleBelongsToProject($project, $automationRule);
        $this->authorize('updateAutomation', $project);

        $name = $automationRule->name;

        $this->automationRuleService->delete($automationRule);

        return redirect()->back()->with('success', "The \"$name\" automation rule has been deleted.");
    }

    private function validateRule(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'trigger_type' => ['required', Rule::enum(AutomationTriggerType::class)],
            'enabled' => ['sometimes', 'boolean'],
            'conditions' => ['sometimes', 'array'],
            'conditions.*.field' => ['required_with:conditions', 'string'],
            'conditions.*.operator' => ['required_with:conditions', 'string', 'in:equals,not_equals,contains,in'],
            'conditions.*.value' => ['present'],
            'actions' => ['required', 'array', 'min:1'],
            'actions.*.type' => ['required', Rule::enum(AutomationActionType::class)],
            'actions.*.params' => ['sometimes', 'array'],
        ]);
    }

    private function ensureRuleBelongsToProject(Project $project, AutomationRule $automationRule): void
    {
        if ($automationRule->project_id !== $project->id) {
            throw new NotFoundHttpException;
        }
    }
}
