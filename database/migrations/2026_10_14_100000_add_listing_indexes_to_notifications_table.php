<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            // The popup pages by id within one user, optionally narrowed to
            // unread; retention deletes by created_at within one user.
            $table->index(['user_id', 'read', 'id'], 'notifications_user_read_id_index');
            $table->index(['user_id', 'created_at'], 'notifications_user_created_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_user_read_id_index');
            $table->dropIndex('notifications_user_created_at_index');
        });
    }
};
