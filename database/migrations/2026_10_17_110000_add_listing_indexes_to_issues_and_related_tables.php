<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indexes for the queries behind the project page, calendar, dashboard and
 * project list: every one of them filters by project (or user) first and then
 * orders or ranges on a second column, which the single-column foreign key
 * and unique indexes cannot serve.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->index(['project_id', 'created_at'], 'issues_project_created_at_index');
            $table->index(['project_id', 'start_date'], 'issues_project_start_date_index');
            $table->index(['project_id', 'end_date'], 'issues_project_end_date_index');
            $table->index(['project_id', 'workflow_status_id'], 'issues_project_workflow_status_index');
            $table->index('assignee_id', 'issues_assignee_id_index');
        });

        Schema::table('project_user', function (Blueprint $table) {
            $table->index(['user_id', 'project_id'], 'project_user_user_project_index');
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->index(['project_id', 'created_at'], 'activity_logs_project_created_at_index');
            $table->index(['user_id', 'created_at'], 'activity_logs_user_created_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropIndex('activity_logs_user_created_at_index');
            $table->dropIndex('activity_logs_project_created_at_index');
        });

        Schema::table('project_user', function (Blueprint $table) {
            $table->dropIndex('project_user_user_project_index');
        });

        Schema::table('issues', function (Blueprint $table) {
            $table->dropIndex('issues_assignee_id_index');
            $table->dropIndex('issues_project_workflow_status_index');
            $table->dropIndex('issues_project_end_date_index');
            $table->dropIndex('issues_project_start_date_index');
            $table->dropIndex('issues_project_created_at_index');
        });
    }
};
