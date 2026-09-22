<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_integrations', function (Blueprint $table) {
            $table->timestamp('github_last_sync_attempt_at')->nullable()->after('github_last_synced_at');
            $table->timestamp('github_last_failed_sync_at')->nullable()->after('github_last_sync_attempt_at');
            $table->string('github_last_error_code', 100)->nullable()->after('github_last_failed_sync_at');
            $table->string('github_last_error_message', 255)->nullable()->after('github_last_error_code');
            $table->unsignedInteger('github_consecutive_failures')->default(0)->after('github_last_error_message');
            $table->unsignedInteger('github_pending_event_count')->nullable()->after('github_consecutive_failures');
        });
    }

    public function down(): void
    {
        Schema::table('project_integrations', function (Blueprint $table) {
            $table->dropColumn([
                'github_last_sync_attempt_at',
                'github_last_failed_sync_at',
                'github_last_error_code',
                'github_last_error_message',
                'github_consecutive_failures',
                'github_pending_event_count',
            ]);
        });
    }
};
