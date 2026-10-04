<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Gives every issue a per-project number (what users see as "#12"),
     * independent of the global primary key. Existing issues keep number = id
     * on purpose: every "#N" already written into comments, activity logs,
     * notifications, GitHub branch names and PR titles stays valid, and the
     * numbers stay unique within each project because ids are unique overall.
     * Only issues created after this migration are numbered per project.
     */
    public function up(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->unsignedInteger('number')->nullable()->after('id');
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->unsignedInteger('next_issue_number')->default(1);
        });

        DB::table('issues')->update(['number' => DB::raw('id')]);

        DB::table('projects')->orderBy('id')->each(function ($project) {
            $max = (int) DB::table('issues')->where('project_id', $project->id)->max('number');

            DB::table('projects')->where('id', $project->id)->update(['next_issue_number' => $max + 1]);
        });

        Schema::table('issues', function (Blueprint $table) {
            $table->unique(['project_id', 'number']);
        });
    }

    public function down(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->dropUnique(['project_id', 'number']);
            $table->dropColumn('number');
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('next_issue_number');
        });
    }
};
