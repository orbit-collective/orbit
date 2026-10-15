<?php

use App\Models\Project;
use App\Services\IssueTypeService;
use App\Support\Cache\CacheVersion;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * An issue's status is its workflow status (issues.workflow_status_id) and
 * nothing else: the legacy open/in_progress/closed column is moved onto it
 * for every issue that still has no workflow status, then dropped.
 */
return new class extends Migration
{
    private const array LEGACY_TO_CATEGORY = [
        'open' => 'todo',
        'in_progress' => 'in_progress',
        'closed' => 'done',
    ];

    private const array CATEGORY_TO_LEGACY = [
        'todo' => 'open',
        'in_progress' => 'in_progress',
        'done' => 'closed',
    ];

    public function up(): void
    {
        $this->moveLegacyStatusOntoWorkflow();

        Schema::table('issues', function (Blueprint $table) {
            $table->dropColumn('status');
        });

        $this->recreateDateCheckTriggers();

        // Issues were written through the query builder, so no model event
        // dropped the cached issue lists.
        CacheVersion::bump(CacheVersion::ISSUES);
    }

    public function down(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->enum('status', ['open', 'in_progress', 'closed'])->default('open')->after('description');
        });

        $categories = DB::table('workflow_statuses')->pluck('category', 'id');

        DB::table('issues')->whereNotNull('workflow_status_id')->orderBy('id')->each(function ($issue) use ($categories) {
            DB::table('issues')->where('id', $issue->id)->update([
                'status' => self::CATEGORY_TO_LEGACY[$categories[$issue->workflow_status_id] ?? 'todo'] ?? 'open',
            ]);
        });

        $this->recreateDateCheckTriggers();

        CacheVersion::bump(CacheVersion::ISSUES);
    }

    /**
     * Issues that predate issue types (no type) or whose project was never
     * opened since (so it has no workflow yet) only know their legacy value.
     * The projects are seeded first, then each such issue lands on the status
     * of its type's workflow that stands for its legacy category, falling
     * back to the initial status when the workflow has none of that category.
     */
    private function moveLegacyStatusOntoWorkflow(): void
    {
        $legacy = DB::table('issues')->whereNull('workflow_status_id')->pluck('status', 'id');

        if ($legacy->isEmpty()) {
            return;
        }

        $seeder = app(IssueTypeService::class);

        Project::query()
            ->whereIn('id', DB::table('issues')->whereIn('id', $legacy->keys())->pluck('project_id')->unique())
            ->each(fn (Project $project) => $seeder->ensureSystemIssueTypes($project));

        $taskTypes = [];

        foreach ($legacy as $issueId => $value) {
            $issue = DB::table('issues')->where('id', $issueId)->first(['id', 'project_id', 'issue_type_id']);

            $typeId = $issue->issue_type_id
                ?? $taskTypes[$issue->project_id]
                ??= DB::table('issue_types')->where('project_id', $issue->project_id)->where('name', 'Task')->value('id');

            if (! $typeId) {
                continue;
            }

            $statuses = DB::table('workflow_statuses')->where('issue_type_id', $typeId)->orderBy('sort_order')->orderBy('id');

            $statusId = (clone $statuses)->where('category', self::LEGACY_TO_CATEGORY[$value] ?? 'todo')->value('id')
                ?? (clone $statuses)->where('is_initial', true)->value('id')
                ?? (clone $statuses)->value('id');

            DB::table('issues')->where('id', $issueId)->update([
                'issue_type_id' => $typeId,
                'workflow_status_id' => $statusId,
            ]);
        }
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
