<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('external_issue_links', function (Blueprint $table) {
            $table->timestamp('github_updated_at')->nullable()->after('draft');
            $table->timestamp('merged_at')->nullable()->after('github_updated_at');
        });
    }

    public function down(): void
    {
        Schema::table('external_issue_links', function (Blueprint $table) {
            $table->dropColumn(['github_updated_at', 'merged_at']);
        });
    }
};
