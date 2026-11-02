<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->foreignId('issue_id')->nullable()->after('project_id')->constrained()->nullOnDelete();
            $table->index(['issue_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropIndex(['issue_id', 'created_at']);
            $table->dropConstrainedForeignId('issue_id');
        });
    }
};
