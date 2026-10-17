<?php

use App\Support\Cache\CacheVersion;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * An issue's labels are rows in issue_label pointing at labels.id instead of
 * a JSON array of names: filtering is an exact match on the id (no more
 * `LIKE '%bug%'` also catching "debug") and renaming a label is visible on
 * every issue at once. Existing JSON names are moved onto the pivot, then the
 * column is dropped; saved filters that stored label names are rewritten to
 * label ids.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('issue_label', function (Blueprint $table) {
            $table->foreignId('issue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('label_id')->constrained()->cascadeOnDelete();

            $table->primary(['issue_id', 'label_id']);
            $table->index('label_id');
        });

        $this->moveNamesOntoPivot();
        $this->rewriteSavedFilters();

        Schema::table('issues', function (Blueprint $table) {
            $table->dropColumn('labels');
        });

        $this->recreateDateCheckTriggers();

        CacheVersion::bump(CacheVersion::ISSUES);
    }

    public function down(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->json('labels')->nullable()->after('assignee_id');
        });

        $names = DB::table('issue_label')
            ->join('labels', 'labels.id', '=', 'issue_label.label_id')
            ->orderBy('labels.name')
            ->get(['issue_label.issue_id', 'labels.name'])
            ->groupBy('issue_id');

        foreach ($names as $issueId => $rows) {
            DB::table('issues')->where('id', $issueId)->update(['labels' => json_encode($rows->pluck('name')->all())]);
        }

        $this->recreateDateCheckTriggers();

        Schema::dropIfExists('issue_label');

        CacheVersion::bump(CacheVersion::ISSUES);
    }

    /**
     * Names that no longer match a label of the issue's project are dropped:
     * they were already invisible to every label-aware screen.
     */
    private function moveNamesOntoPivot(): void
    {
        $labelIds = DB::table('labels')->get(['id', 'project_id', 'name'])
            ->mapWithKeys(fn ($label) => [$label->project_id.'|'.$label->name => $label->id]);

        DB::table('issues')->whereNotNull('labels')->orderBy('id')->chunkById(500, function ($issues) use ($labelIds) {
            $rows = [];

            foreach ($issues as $issue) {
                $names = json_decode((string) $issue->labels, true);

                foreach (is_array($names) ? array_unique($names) : [] as $name) {
                    $labelId = $labelIds[$issue->project_id.'|'.$name] ?? null;

                    if ($labelId !== null) {
                        $rows[] = ['issue_id' => $issue->id, 'label_id' => $labelId];
                    }
                }
            }

            foreach (array_chunk($rows, 500) as $chunk) {
                DB::table('issue_label')->insert($chunk);
            }
        });
    }

    private function rewriteSavedFilters(): void
    {
        if (! Schema::hasTable('saved_filters')) {
            return;
        }

        DB::table('saved_filters')->orderBy('id')->each(function ($filter) {
            $params = json_decode((string) $filter->query_params, true);

            if (! is_array($params) || empty($params['labels'])) {
                return;
            }

            $names = is_array($params['labels']) ? $params['labels'] : explode(',', (string) $params['labels']);

            $ids = DB::table('labels')
                ->where('project_id', $filter->project_id)
                ->whereIn('name', array_map('trim', $names))
                ->pluck('id')
                ->all();

            if ($ids === []) {
                unset($params['labels']);
            } else {
                $params['labels'] = implode(',', $ids);
            }

            DB::table('saved_filters')->where('id', $filter->id)->update(['query_params' => json_encode($params)]);
        });
    }

    /**
     * Dropping a column rebuilds the table on SQLite, which silently drops the
     * date-order triggers from add_date_check_constraint_to_issues_table -
     * recreate them, same as the other issues table migrations do.
     */
    private function recreateDateCheckTriggers(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS validate_issue_dates_insert');
        DB::unprepared('DROP TRIGGER IF EXISTS validate_issue_dates_update');

        DB::unprepared('
            CREATE TRIGGER validate_issue_dates_insert
            BEFORE INSERT ON issues
            FOR EACH ROW
            WHEN NEW.end_date IS NOT NULL AND NEW.start_date IS NOT NULL AND NEW.end_date < NEW.start_date
            BEGIN
                SELECT RAISE(ABORT, "The end date must be greater than or equal to the start date.");
            END;
        ');

        DB::unprepared('
            CREATE TRIGGER validate_issue_dates_update
            BEFORE UPDATE ON issues
            FOR EACH ROW
            WHEN NEW.end_date IS NOT NULL AND NEW.start_date IS NOT NULL AND NEW.end_date < NEW.start_date
            BEGIN
                SELECT RAISE(ABORT, "The end date must be greater than or equal to the start date.");
            END;
        ');
    }
};
