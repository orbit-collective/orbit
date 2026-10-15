<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Rewrites the old open/in_progress/closed words that issues.status used to
 * hold - saved in automation conditions, saved filters and status import
 * mappings - into workflow status categories (todo/in_progress/done), now
 * that the column is gone and nothing reads the old words any more.
 */
return new class extends Migration
{
    private const array CATEGORY_OF = [
        'open' => 'todo',
        'in_progress' => 'in_progress',
        'closed' => 'done',
    ];

    private const array CATEGORY_FIELD_OF = [
        'issue.status' => 'issue.category',
        'issue.previousStatus' => 'issue.previousCategory',
    ];

    public function up(): void
    {
        $this->migrateAutomationConditions();
        $this->migrateSavedFilters();
        $this->migrateStatusMappings();
    }

    /** The old words cannot be told apart from today's categories, so there is nothing to restore. */
    public function down(): void {}

    /**
     * A condition on the issue's status ("issue.status equals closed") becomes
     * one on its category ("issue.category equals done"). Conditions that
     * already name a real status ("In Review") are left alone.
     */
    private function migrateAutomationConditions(): void
    {
        DB::table('automation_rules')->whereNotNull('conditions')->orderBy('id')->each(function ($rule) {
            $conditions = json_decode($rule->conditions, true);

            if (! is_array($conditions)) {
                return;
            }

            $changed = false;

            foreach ($conditions as &$condition) {
                $field = $condition['field'] ?? null;
                $value = $condition['value'] ?? null;

                if (! isset(self::CATEGORY_FIELD_OF[$field])) {
                    continue;
                }

                $isLegacy = is_array($value)
                    ? $value !== [] && array_all($value, fn ($word) => isset(self::CATEGORY_OF[$word]))
                    : isset(self::CATEGORY_OF[$value]);

                if (! $isLegacy) {
                    continue;
                }

                $condition['field'] = self::CATEGORY_FIELD_OF[$field];
                $condition['value'] = is_array($value)
                    ? array_map(fn ($word) => self::CATEGORY_OF[$word], $value)
                    : self::CATEGORY_OF[$value];
                $changed = true;
            }
            unset($condition);

            if ($changed) {
                DB::table('automation_rules')->where('id', $rule->id)->update(['conditions' => json_encode($conditions)]);
            }
        });
    }

    private function migrateSavedFilters(): void
    {
        DB::table('saved_filters')->orderBy('id')->each(function ($filter) {
            $params = json_decode($filter->query_params, true);

            if (! is_array($params) || ! isset($params['status']) || ! is_string($params['status'])) {
                return;
            }

            $words = array_map(fn ($word) => self::CATEGORY_OF[$word] ?? $word, explode(',', $params['status']));
            $migrated = implode(',', $words);

            if ($migrated !== $params['status']) {
                $params['status'] = $migrated;
                DB::table('saved_filters')->where('id', $filter->id)->update(['query_params' => json_encode($params)]);
            }
        });
    }

    private function migrateStatusMappings(): void
    {
        foreach (['open' => 'todo', 'closed' => 'done'] as $old => $new) {
            DB::table('integration_field_mappings')
                ->where('mapping_type', 'status')
                ->where('orbit_value', $old)
                ->update(['orbit_value' => $new]);
        }
    }
};
