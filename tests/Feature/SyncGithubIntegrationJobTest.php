<?php

use App\Jobs\SyncGithubIntegrationJob;
use App\Models\Project;
use App\Models\ProjectIntegration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

test('handle() runs a sync cycle for the given integration', function () {
    $project = Project::factory()->create();
    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
        'github_consecutive_failures' => 2,
        'github_last_error_code' => 'INTERNAL_SERVER_ERROR',
    ]);

    Http::fake(['*/v1/github/events' => Http::response(['success' => true, 'data' => ['events' => []]], 200)]);

    $job = new SyncGithubIntegrationJob($projectIntegration);
    app()->call([$job, 'handle']);

    $projectIntegration->refresh();
    expect($projectIntegration->github_consecutive_failures)->toBe(0)
        ->and($projectIntegration->github_last_error_code)->toBeNull()
        ->and($projectIntegration->github_last_synced_at)->not->toBeNull();
});

test('handle() does nothing but record the outcome for a revoked integration', function () {
    $project = Project::factory()->create();
    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'revoked',
    ]);

    $job = new SyncGithubIntegrationJob($projectIntegration);
    app()->call([$job, 'handle']);

    Http::assertNothingSent();
});
