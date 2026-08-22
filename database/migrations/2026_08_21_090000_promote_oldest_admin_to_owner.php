<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Backfills the new "owner" tier: every existing project gets its longest-standing
     * admin promoted to owner, since the app previously had no concept of an owner
     * distinct from admin.
     */
    public function up(): void
    {
        DB::table('project_user')
            ->select('project_id')
            ->where('role', 'admin')
            ->groupBy('project_id')
            ->orderBy('project_id')
            ->pluck('project_id')
            ->each(function (int $projectId) {
                $oldestAdminId = DB::table('project_user')
                    ->where('project_id', $projectId)
                    ->where('role', 'admin')
                    ->orderBy('created_at')
                    ->orderBy('id')
                    ->value('id');

                DB::table('project_user')
                    ->where('id', $oldestAdminId)
                    ->update(['role' => 'owner']);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('project_user')
            ->where('role', 'owner')
            ->update(['role' => 'admin']);
    }
};
