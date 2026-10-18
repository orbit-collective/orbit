<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('priorities', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('name');
            $table->string('color');
            $table->string('icon');
            $table->unsignedSmallInteger('position')->default(0);
            $table->boolean('is_default')->default(false);

            $table->timestamps();

            $table->unique(['project_id', 'name']);
            $table->index(['project_id', 'position']);
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->timestamp('priorities_seeded_at')->nullable()->after('labels_seeded_at');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('priorities_seeded_at');
        });

        Schema::dropIfExists('priorities');
    }
};
