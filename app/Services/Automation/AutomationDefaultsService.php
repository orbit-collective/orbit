<?php

namespace App\Services\Automation;

use App\Enums\AutomationActionType;
use App\Enums\AutomationTriggerType;
use App\Models\Project;

/**
 * Seeds a small set of sensible default automation rules the first time a
 * project connects to GitHub - so "PR merged moves the issue forward"
 * behavior exists out of the box instead of requiring every project to
 * discover and configure Settings -> Automation manually. Each default rule
 * uses a category-based ChangeStatus action (see ChangeStatusAction), never
 * a specific workflow_status_id, so the same two rules work for every issue
 * type in the project regardless of its own workflow - an issue type with
 * no matching category status is simply left untouched (a safe no-op, not
 * an error).
 *
 * Idempotent by rule name within the project: seedForProject() is safe to
 * call on every GitHub (re)connection (see GithubIntegrationService) and
 * from the one-off backfill command for projects that connected before this
 * existed (see SeedDefaultGithubAutomationsCommand) - a project that
 * already has a rule with one of these exact names (whether seeded before,
 * or hand-authored by a project admin under the same name) is left alone
 * rather than getting a duplicate.
 */
class AutomationDefaultsService
{
    /**
     * @return array<int, array{name: string, trigger_type: string, actions: array<int, array{type: string, params: array}>}>
     */
    public static function githubDefaults(): array
    {
        return [
            [
                'name' => 'Move to in progress when a pull request opens',
                'trigger_type' => AutomationTriggerType::GithubPullRequestOpened->value,
                'actions' => [
                    ['type' => AutomationActionType::ChangeStatus->value, 'params' => ['category' => 'in_progress']],
                ],
            ],
            [
                'name' => 'Move to done when a pull request merges',
                'trigger_type' => AutomationTriggerType::GithubPullRequestMerged->value,
                'actions' => [
                    ['type' => AutomationActionType::ChangeStatus->value, 'params' => ['category' => 'done']],
                ],
            ],
        ];
    }

    public function __construct(
        protected AutomationRuleService $automationRuleService,
    ) {}

    /**
     * @return int the number of rules actually created (0 if every default
     *              rule name already existed for this project).
     */
    public function seedGithubDefaultsForProject(Project $project): int
    {
        $existingNames = $project->automationRules()->pluck('name')->all();
        $created = 0;

        foreach (self::githubDefaults() as $default) {
            if (in_array($default['name'], $existingNames, true)) {
                continue;
            }

            $this->automationRuleService->create($project, [
                'name' => $default['name'],
                'trigger_type' => $default['trigger_type'],
                'enabled' => true,
                'conditions' => [],
                'actions' => $default['actions'],
            ]);

            $created++;
        }

        return $created;
    }
}
