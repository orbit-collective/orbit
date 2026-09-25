<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('github_repositories', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_integration_id')->constrained('project_integrations')->cascadeOnDelete();
            $table->unsignedBigInteger('repository_id');
            $table->string('owner');
            $table->string('name');

            $table->timestamps();

            $table->unique(['project_integration_id', 'repository_id']);
        });

        // Backfill: every existing single-repository GitHub integration
        // becomes the first row in its new repository relation, so nothing
        // is lost and no reconnect is required. The old scalar columns on
        // project_integrations are left untouched (still populated as the
        // "primary" repository) - see App\Models\ProjectIntegration and
        // documentation/en/integrations/06-github-integration.md.
        DB::table('project_integrations')
            ->where('integration', 'github')
            ->whereNotNull('github_repository_id')
            ->whereNotNull('github_repository_owner')
            ->whereNotNull('github_repository_name')
            ->orderBy('id')
            ->get()
            ->each(function ($projectIntegration) {
                DB::table('github_repositories')->insert([
                    'project_integration_id' => $projectIntegration->id,
                    'repository_id' => $projectIntegration->github_repository_id,
                    'owner' => $projectIntegration->github_repository_owner,
                    'name' => $projectIntegration->github_repository_name,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('github_repositories');
    }
};
