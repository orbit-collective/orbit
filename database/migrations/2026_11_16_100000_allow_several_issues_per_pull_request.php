<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A pull request can now be linked to several Orbit issues (one row per
     * issue), so the pull request alone no longer identifies a link: the
     * (integration, external id) pair is unique per issue instead. The new
     * index is added before the old one is dropped, so the foreign key on
     * project_integration_id always has an index to lean on.
     */
    public function up(): void
    {
        Schema::table('external_issue_links', function (Blueprint $table) {
            $table->unique(['project_integration_id', 'external_id', 'issue_id'], 'external_issue_links_pr_issue_unique');
        });

        Schema::table('external_issue_links', function (Blueprint $table) {
            $table->dropUnique(['project_integration_id', 'external_id']);
        });
    }

    public function down(): void
    {
        Schema::table('external_issue_links', function (Blueprint $table) {
            $table->unique(['project_integration_id', 'external_id']);
        });

        Schema::table('external_issue_links', function (Blueprint $table) {
            $table->dropUnique('external_issue_links_pr_issue_unique');
        });
    }
};
