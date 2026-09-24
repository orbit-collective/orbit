<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('automation_rules', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('name');
            $table->string('trigger_type');
            $table->json('conditions')->nullable();
            $table->boolean('enabled')->default(true);

            $table->timestamps();

            $table->index(['project_id', 'trigger_type', 'enabled']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('automation_rules');
    }
};
