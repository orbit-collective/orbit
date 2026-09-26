<?php

use App\Models\Project;
use App\Models\ProjectIntegration;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('seeds default rules for every connected github project and skips unconnected ones', function () {
    $connectedProject = Project::factory()->create();
    ProjectIntegration::query()->create([
        'project_id' => $connectedProject->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    $pendingProject = Project::factory()->create();
    ProjectIntegration::query()->create([
        'project_id' => $pendingProject->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'pending',
    ]);

    $this->artisan('automation:seed-github-defaults')->assertExitCode(0);

    expect($connectedProject->automationRules()->count())->toBe(2);
    expect($pendingProject->automationRules()->count())->toBe(0);
});

test('running the backfill twice does not duplicate rules', function () {
    $project = Project::factory()->create();
    ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    $this->artisan('automation:seed-github-defaults')->assertExitCode(0);
    $this->artisan('automation:seed-github-defaults')->assertExitCode(0);

    expect($project->automationRules()->count())->toBe(2);
});
