<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_integrations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('integration');
            $table->boolean('enabled')->default(false);

            $table->timestamps();

            $table->unique(['project_id', 'integration']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_integrations');
    }
};
