<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A member's and an invitation's tier now lives only in their system role
     * (see 2026_10_13_100000_backfill_system_roles_for_existing_members), so
     * the string columns that used to hold it go away.
     */
    public function up(): void
    {
        Schema::table('project_user', function (Blueprint $table) {
            $table->dropColumn('role');
        });

        Schema::table('project_invitations', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }

    /**
     * Brings the columns back and fills them from the system roles, so a
     * rollback leaves the old model working with the current assignments.
     */
    public function down(): void
    {
        Schema::table('project_user', function (Blueprint $table) {
            $table->string('role')->default('member')->after('user_id');
        });

        Schema::table('project_invitations', function (Blueprint $table) {
            $table->string('role')->default('member')->after('token');
        });

        $this->restoreTiers('project_user_role', 'project_user_id', 'project_user');
        $this->restoreTiers('project_invitation_role', 'project_invitation_id', 'project_invitations');
    }

    private function restoreTiers(string $pivot, string $foreignKey, string $table): void
    {
        DB::table($pivot)
            ->join('roles', 'roles.id', '=', "$pivot.role_id")
            ->where('roles.is_system', true)
            ->get([$foreignKey, 'roles.role'])
            ->each(fn ($row) => DB::table($table)->where('id', $row->{$foreignKey})->update(['role' => $row->role]));
    }
};
