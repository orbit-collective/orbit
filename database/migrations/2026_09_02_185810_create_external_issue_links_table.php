<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('external_issue_links', function (Blueprint $table) {
            $table->id();

            $table->foreignId('issue_id')->constrained('issues')->cascadeOnDelete();
            $table->foreignId('project_integration_id')->constrained('project_integrations')->cascadeOnDelete();
            $table->string('external_id');
            $table->string('external_key')->nullable();
            $table->string('external_url')->nullable();
            $table->string('external_type')->nullable();
            $table->timestamp('last_synced_at')->nullable();

            $table->timestamps();

            $table->unique(['project_integration_id', 'external_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('external_issue_links');
    }
};
