<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workflow_statuses', function (Blueprint $table) {
            $table->id();

            $table->foreignId('issue_type_id')->constrained('issue_types')->cascadeOnDelete();
            $table->string('name');
            $table->string('color');
            $table->string('category');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_initial')->default(false);

            $table->timestamps();

            $table->unique(['issue_type_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workflow_statuses');
    }
};
