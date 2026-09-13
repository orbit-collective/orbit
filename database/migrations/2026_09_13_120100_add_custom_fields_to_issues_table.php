<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            // Keyed by issue_type_fields.id, not by label, so renaming a field
            // never orphans the values already stored against it.
            $table->json('custom_fields')->nullable()->after('labels');
        });
    }

    public function down(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->dropColumn('custom_fields');
        });
    }
};
