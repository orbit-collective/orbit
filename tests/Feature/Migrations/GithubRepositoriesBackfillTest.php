<?php

use App\Models\Project;
use App\Models\ProjectIntegration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('the github_repositories migration backfills existing single-repository integrations', function () {
    $project = Project::factory()->create();

    // A pre-migration-era GitHub integration: connected, single repository,
    // only ever recorded on project_integrations' own scalar columns.
    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_status' => 'connected',
        'github_repository_id' => 999,
        'github_repository_owner' => 'orbit-collective',
        'github_repository_name' => 'orbit',
    ]);

    // A legacy integration row with no repository selected yet must not
    // produce a backfilled row at all.
    $pendingIntegration = ProjectIntegration::query()->create([
        'project_id' => Project::factory()->create()->id,
        'integration' => 'github',
        'enabled' => true,
        'github_status' => 'pending',
    ]);

    // Re-run just this migration's backfill logic against a table dropped
    // back to its pre-migration state, so the test exercises the actual
    // migration code rather than re-asserting fixture data.
    Schema::dropIfExists('github_repositories');

    $migration = require database_path('migrations/2026_09_25_171043_create_github_repositories_table.php');
    $migration->up();

    $this->assertDatabaseHas('github_repositories', [
        'project_integration_id' => $projectIntegration->id,
        'repository_id' => 999,
        'owner' => 'orbit-collective',
        'name' => 'orbit',
    ]);

    expect(
        DB::table('github_repositories')
            ->where('project_integration_id', $pendingIntegration->id)
            ->exists()
    )->toBeFalse();

    expect(DB::table('github_repositories')->count())->toBe(1);
});
