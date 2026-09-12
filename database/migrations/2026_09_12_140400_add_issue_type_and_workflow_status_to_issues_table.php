<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->foreignId('issue_type_id')->nullable()->after('parent_id')
                ->constrained('issue_types')->restrictOnDelete();
            $table->foreignId('workflow_status_id')->nullable()->after('issue_type_id')
                ->constrained('workflow_statuses')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->dropConstrainedForeignId('issue_type_id');
            $table->dropConstrainedForeignId('workflow_status_id');
        });
    }
};
