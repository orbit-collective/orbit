<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('issue_type_templates', function (Blueprint $table) {
            $table->id();

            $table->foreignId('issue_type_id')->constrained('issue_types')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('default_priority')->nullable();
            $table->json('default_labels')->nullable();

            $table->timestamps();

            $table->unique(['issue_type_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('issue_type_templates');
    }
};
