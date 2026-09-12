<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('issue_types', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('name');
            $table->string('icon');
            $table->string('color');
            $table->string('description')->nullable();
            $table->boolean('is_system')->default(false);
            $table->boolean('allows_children')->default(false);
            $table->json('required_fields')->nullable();
            $table->json('restricted_role_types')->nullable();
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();

            $table->unique(['project_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('issue_types');
    }
};
