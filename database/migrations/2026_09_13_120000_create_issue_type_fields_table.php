<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('issue_type_fields', function (Blueprint $table) {
            $table->id();

            $table->foreignId('issue_type_id')->constrained('issue_types')->cascadeOnDelete();
            $table->string('label');
            $table->string('type');
            $table->json('options')->nullable();
            $table->string('placeholder')->nullable();
            $table->boolean('is_required')->default(false);
            $table->integer('sort_order')->default(0);

            $table->timestamps();

            $table->unique(['issue_type_id', 'label']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('issue_type_fields');
    }
};
