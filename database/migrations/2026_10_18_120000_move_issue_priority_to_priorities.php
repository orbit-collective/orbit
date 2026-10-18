<?php

use App\Models\Project;
use App\Services\PriorityService;
use App\Support\Cache\CacheVersion;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * An issue's priority is a row of its project's priority scale
 * (issues.priority_id) instead of the fixed low/medium/high column. Every
 * project that has issues is seeded with the starter scale first, each issue
 * is pointed at the priority carrying its old word, and the column is
 * dropped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->foreignId('priority_id')->nullable()->after('description')
                ->constrained('priorities')->nullOnDelete();
            $table->index(['project_id', 'priority_id'], 'issues_project_priority_index');
        });

        $this->moveLegacyPriorityOntoScale();

        Schema::table('issues', function (Blueprint $table) {
            $table->dropColumn('priority');
        });

        $this->recreateDateCheckTriggers();

        // Issues were written through the query builder, so no model event
        // dropped the cached issue lists.
        CacheVersion::bump(CacheVersion::ISSUES);
    }

    public function down(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium')->after('description');
        });

        // The scale is free-form again as a three-step word: the first and
        // last priority of a project stand for high and low, the rest medium.
        DB::table('priorities')->orderBy('project_id')->orderBy('position')->get()
            ->groupBy('project_id')
            ->each(function ($priorities) {
                $first = $priorities->first()->id;
                $last = $priorities->last()->id;

                foreach ($priorities as $priority) {
                    $word = match (true) {
                        $priorities->count() > 1 && $priority->id === $first => 'high',
                        $priorities->count() > 1 && $priority->id === $last => 'low',
                        default => 'medium',
                    };

                    DB::table('issues')->where('priority_id', $priority->id)->update(['priority' => $word]);
                }
            });

        Schema::table('issues', function (Blueprint $table) {
            $table->dropIndex('issues_project_priority_index');
            $table->dropConstrainedForeignId('priority_id');
        });

        $this->recreateDateCheckTriggers();

        CacheVersion::bump(CacheVersion::ISSUES);
    }

    private function moveLegacyPriorityOntoScale(): void
    {
        $seeder = app(PriorityService::class);

        Project::query()
            ->whereIn('id', DB::table('issues')->select('project_id')->distinct())
            ->each(function (Project $project) use ($seeder) {
                $seeder->ensureSystemPriorities($project);

                $ids = DB::table('priorities')
                    ->where('project_id', $project->id)
                    ->pluck('id', 'name')
                    ->mapWithKeys(fn ($id, $name) => [mb_strtolower($name) => $id]);

                foreach (['high', 'medium', 'low'] as $word) {
                    DB::table('issues')
                        ->where('project_id', $project->id)
                        ->where('priority', $word)
                        ->update(['priority_id' => $ids[$word] ?? null]);
                }
            });
    }

    /**
     * Dropping a column rebuilds the table on SQLite, which silently drops the
     * date-order triggers - recreate them, same as the other issues table
     * migrations do.
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
