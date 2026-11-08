<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dashboard_saved_layouts', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 40);

            // The widgets as a dashboard layout holds them.
            $table->json('widgets');
            $table->unsignedSmallInteger('version')->default(1);

            $table->timestamps();

            // Saving under a name that exists replaces that layout.
            $table->unique(['user_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dashboard_saved_layouts');
    }
};
