<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('issue_type_children', function (Blueprint $table) {
            $table->id();

            $table->foreignId('issue_type_id')->constrained('issue_types')->cascadeOnDelete();
            $table->foreignId('child_issue_type_id')->constrained('issue_types')->cascadeOnDelete();

            $table->timestamps();

            $table->unique(['issue_type_id', 'child_issue_type_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('issue_type_children');
    }
};
