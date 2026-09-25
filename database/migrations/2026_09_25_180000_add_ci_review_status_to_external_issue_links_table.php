<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('external_issue_links', function (Blueprint $table) {
            $table->string('check_status')->nullable()->after('merged_at');
            $table->string('review_status')->nullable()->after('check_status');
        });
    }

    public function down(): void
    {
        Schema::table('external_issue_links', function (Blueprint $table) {
            $table->dropColumn(['check_status', 'review_status']);
        });
    }
};
