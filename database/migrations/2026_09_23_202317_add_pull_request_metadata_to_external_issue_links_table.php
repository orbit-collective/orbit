<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('external_issue_links', function (Blueprint $table) {
            $table->string('pull_request_title', 500)->nullable()->after('external_type');
            $table->string('source_branch', 500)->nullable()->after('pull_request_title');
            $table->string('target_branch', 500)->nullable()->after('source_branch');
            $table->string('status', 20)->nullable()->after('target_branch');
            $table->boolean('draft')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('external_issue_links', function (Blueprint $table) {
            $table->dropColumn(['pull_request_title', 'source_branch', 'target_branch', 'status', 'draft']);
        });
    }
};
