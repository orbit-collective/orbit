<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_field_mappings', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_integration_id')->constrained('project_integrations')->cascadeOnDelete();
            $table->string('mapping_type');
            $table->string('external_value');
            $table->string('external_label')->nullable();
            $table->string('orbit_value');

            $table->timestamps();

            $table->unique(['project_integration_id', 'mapping_type', 'external_value']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_field_mappings');
    }
};
