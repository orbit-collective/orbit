<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Databases that already ran add_issue_type_and_workflow_status_to_issues_table
 * before it learned to recreate them lost the date-order triggers for good -
 * the migration won't run again for them. This puts the triggers back, and is
 * a no-op on a database that still has them.
 */
return new class extends Migration
{
    public function up(): void
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

    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS validate_issue_dates_insert');
        DB::unprepared('DROP TRIGGER IF EXISTS validate_issue_dates_update');
    }
};
