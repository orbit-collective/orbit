<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dashboard_layouts', function (Blueprint $table) {
            $table->id();

            // One layout per user; no row means the default layout.
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();

            // Ordered list of widgets (id, type, variant, span, visible, config).
            $table->json('widgets');

            // Bumped when the stored shape changes, so old layouts can be migrated.
            $table->unsignedSmallInteger('version')->default(1);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dashboard_layouts');
    }
};
