<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issue_types', function (Blueprint $table) {
            $table->boolean('is_top_level')->default(true)->after('allows_children');
        });
    }

    public function down(): void
    {
        Schema::table('issue_types', function (Blueprint $table) {
            $table->dropColumn('is_top_level');
        });
    }
};
