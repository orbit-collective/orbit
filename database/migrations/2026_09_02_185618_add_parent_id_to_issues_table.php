<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->foreignId('parent_id')->nullable()->after('project_id')->constrained('issues')->nullOnDelete();
        });

        // Adding a constrained() foreign key rebuilds the table on SQLite
        // (create new, copy, drop old, rename), which silently drops the
        // date-order triggers from add_date_check_constraint_to_issues_table
        // — recreate them, same as add_in_progress_to_issues_status_enum did.
        $this->recreateDateCheckTriggers();
    }

    public function down(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropColumn('parent_id');
        });

        $this->recreateDateCheckTriggers();
    }

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
