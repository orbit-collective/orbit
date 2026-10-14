<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_retention_settings', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();

            $table->boolean('enabled')->default(false);
            $table->string('frequency')->default('weekly');

            // null = leave that kind of data alone when the schedule runs.
            $table->unsignedSmallInteger('notifications_older_than_days')->nullable();
            $table->boolean('notifications_only_read')->default(true);
            $table->unsignedSmallInteger('activity_older_than_days')->nullable();

            $table->timestamp('last_run_at')->nullable();

            $table->timestamps();

            $table->index(['enabled', 'frequency', 'last_run_at'], 'notification_retention_due_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_retention_settings');
    }
};
