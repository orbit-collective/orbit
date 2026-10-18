<?php

use App\Models\Project;
use App\Services\PriorityService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Priorities are now a project's own scale, so the old low/medium/high words
 * kept outside the issues table are brought onto it: template defaults, Jira
 * priority mappings and change-priority automation actions take the scale's
 * canonical name ("high" becomes "High"), and a saved filter's priority words
 * become priority ids, which is what the filter takes now.
 *
 * Every project is seeded with the starter scale first, so the words always
 * have a priority to land on. A word the project has no priority for is
 * dropped (templates, saved filters) or left as it is (mappings, actions).
 */
return new class extends Migration
{
    public function up(): void
    {
        $seeder = app(PriorityService::class);

        Project::query()->each(fn (Project $project) => $seeder->ensureSystemPriorities($project));

        $this->migrateTemplates();
        $this->migrateMappings();
        $this->migrateAutomationActions();
        $this->migrateSavedFilters();
    }

    /** The old words cannot be told apart from today's names and ids, so there is nothing to restore. */
    public function down(): void {}

    /** @return array<int, array<string, array{id: int, name: string}>> priorities by project, keyed by lower-cased name */
    private function scales(): array
    {
        return DB::table('priorities')->get(['id', 'project_id', 'name'])
            ->groupBy('project_id')
            ->map(fn ($priorities) => $priorities->mapWithKeys(fn ($priority) => [
                mb_strtolower($priority->name) => ['id' => $priority->id, 'name' => $priority->name],
            ])->all())
            ->all();
    }

    private function migrateTemplates(): void
    {
        $scales = $this->scales();

        DB::table('issue_type_templates')
            ->join('issue_types', 'issue_types.id', '=', 'issue_type_templates.issue_type_id')
            ->whereNotNull('issue_type_templates.default_priority')
            ->get(['issue_type_templates.id', 'issue_type_templates.default_priority', 'issue_types.project_id'])
            ->each(function ($template) use ($scales) {
                $match = $scales[$template->project_id][mb_strtolower($template->default_priority)] ?? null;

                DB::table('issue_type_templates')->where('id', $template->id)->update(['default_priority' => $match['name'] ?? null]);
            });
    }

    private function migrateMappings(): void
    {
        $scales = $this->scales();

        DB::table('integration_field_mappings')
            ->join('project_integrations', 'project_integrations.id', '=', 'integration_field_mappings.project_integration_id')
            ->where('integration_field_mappings.mapping_type', 'priority')
            ->get(['integration_field_mappings.id', 'integration_field_mappings.orbit_value', 'project_integrations.project_id'])
            ->each(function ($mapping) use ($scales) {
                $match = $scales[$mapping->project_id][mb_strtolower((string) $mapping->orbit_value)] ?? null;

                if ($match) {
                    DB::table('integration_field_mappings')->where('id', $mapping->id)->update(['orbit_value' => $match['name']]);
                }
            });
    }

    private function migrateAutomationActions(): void
    {
        $scales = $this->scales();

        DB::table('automation_actions')
            ->join('automation_rules', 'automation_rules.id', '=', 'automation_actions.automation_rule_id')
            ->where('automation_actions.type', 'change_priority')
            ->get(['automation_actions.id', 'automation_actions.params', 'automation_rules.project_id'])
            ->each(function ($action) use ($scales) {
                $params = json_decode($action->params, true);
                $match = is_array($params) ? ($scales[$action->project_id][mb_strtolower((string) ($params['priority'] ?? ''))] ?? null) : null;

                if ($match) {
                    DB::table('automation_actions')->where('id', $action->id)->update(['params' => json_encode([...$params, 'priority' => $match['name']])]);
                }
            });
    }

    private function migrateSavedFilters(): void
    {
        $scales = $this->scales();

        DB::table('saved_filters')->orderBy('id')->each(function ($filter) use ($scales) {
            $params = json_decode($filter->query_params, true);

            if (! is_array($params) || ! isset($params['priority']) || ! is_string($params['priority'])) {
                return;
            }

            // Already ids (the migration ran before): nothing to translate.
            if (preg_match('/^\d+(,\d+)*$/', $params['priority'])) {
                return;
            }

            $ids = collect(explode(',', $params['priority']))
                ->map(fn (string $word) => $scales[$filter->project_id][mb_strtolower(trim($word))]['id'] ?? null)
                ->filter()
                ->unique()
                ->values();

            $ids->isEmpty()
                ? $params = array_diff_key($params, ['priority' => true])
                : $params['priority'] = $ids->implode(',');

            DB::table('saved_filters')->where('id', $filter->id)->update(['query_params' => json_encode($params)]);
        });
    }
};
