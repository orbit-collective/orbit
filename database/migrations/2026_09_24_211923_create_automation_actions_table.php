<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('automation_actions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('automation_rule_id')->constrained('automation_rules')->cascadeOnDelete();
            $table->string('type');
            $table->json('params')->nullable();
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();

            $table->index(['automation_rule_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('automation_actions');
    }
};
