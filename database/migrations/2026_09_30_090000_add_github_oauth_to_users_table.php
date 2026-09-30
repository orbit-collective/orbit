<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('password')->nullable()->change();
            $table->string('github_id')->nullable()->unique()->after('password');
            $table->string('github_username')->nullable()->after('github_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // A GitHub-only account created after up() has no password at all -
        // making the column NOT NULL again would otherwise fail outright (or
        // silently corrupt those rows, depending on the driver). Give them
        // an unusable random password rather than leaving the rollback
        // unable to complete; the account is not usable without GitHub
        // either way once this rollback drops github_id/github_username.
        DB::table('users')->whereNull('password')->update([
            'password' => Hash::make(Str::random(64)),
        ]);

        Schema::table('users', function (Blueprint $table) {
            // SQLite's column-drop rebuilds the table and needs the unique
            // index on github_id gone first, or the rebuild itself fails.
            $table->dropUnique(['github_id']);
            $table->dropColumn(['github_id', 'github_username']);
            $table->string('password')->nullable(false)->change();
        });
    }
};
