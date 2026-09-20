<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_integrations', function (Blueprint $table) {
            $table->string('github_connection_id')->nullable()->after('credentials');
            $table->text('github_relay_token')->nullable()->after('github_connection_id');
            $table->string('github_status')->nullable()->after('github_relay_token');
            $table->unsignedBigInteger('github_installation_id')->nullable()->after('github_status');
            $table->unsignedBigInteger('github_repository_id')->nullable()->after('github_installation_id');
            $table->string('github_repository_owner')->nullable()->after('github_repository_id');
            $table->string('github_repository_name')->nullable()->after('github_repository_owner');
            $table->timestamp('github_connected_at')->nullable()->after('github_repository_name');
            $table->timestamp('github_last_synced_at')->nullable()->after('github_connected_at');
            $table->timestamp('github_revoked_at')->nullable()->after('github_last_synced_at');
        });
    }

    public function down(): void
    {
        Schema::table('project_integrations', function (Blueprint $table) {
            $table->dropColumn([
                'github_connection_id',
                'github_relay_token',
                'github_status',
                'github_installation_id',
                'github_repository_id',
                'github_repository_owner',
                'github_repository_name',
                'github_connected_at',
                'github_last_synced_at',
                'github_revoked_at',
            ]);
        });
    }
};
