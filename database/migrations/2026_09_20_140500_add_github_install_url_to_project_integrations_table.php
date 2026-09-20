<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_integrations', function (Blueprint $table) {
            // Not a secret (it's the public GitHub App install URL, one-time
            // state param embedded) — stored plainly so a user can reopen the
            // install flow after navigating away while still "pending",
            // without orbit-api needing to hand it out more than once.
            $table->text('github_install_url')->nullable()->after('github_connection_id');
        });
    }

    public function down(): void
    {
        Schema::table('project_integrations', function (Blueprint $table) {
            $table->dropColumn('github_install_url');
        });
    }
};
