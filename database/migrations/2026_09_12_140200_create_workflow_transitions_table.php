<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workflow_transitions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('issue_type_id')->constrained('issue_types')->cascadeOnDelete();
            $table->foreignId('from_status_id')->constrained('workflow_statuses')->cascadeOnDelete();
            $table->foreignId('to_status_id')->constrained('workflow_statuses')->cascadeOnDelete();

            $table->timestamps();

            $table->unique(['from_status_id', 'to_status_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workflow_transitions');
    }
};
