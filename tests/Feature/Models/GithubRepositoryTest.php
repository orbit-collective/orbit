<?php

use App\Models\GithubRepository;
use App\Models\Project;
use App\Models\ProjectIntegration;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a project integration can have multiple github repositories', function () {
    $project = Project::factory()->create();
    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_repository_owner' => 'orbit-collective',
        'github_repository_name' => 'orbit',
        'github_repository_id' => 111,
    ]);

    GithubRepository::query()->create([
        'project_integration_id' => $projectIntegration->id,
        'repository_id' => 111,
        'owner' => 'orbit-collective',
        'name' => 'orbit',
    ]);

    GithubRepository::query()->create([
        'project_integration_id' => $projectIntegration->id,
        'repository_id' => 222,
        'owner' => 'orbit-collective',
        'name' => 'orbit-api',
    ]);

    expect($projectIntegration->githubRepositories()->count())->toBe(2);
});

test('a duplicate repository mapping for the same integration is rejected', function () {
    $project = Project::factory()->create();
    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
    ]);

    GithubRepository::query()->create([
        'project_integration_id' => $projectIntegration->id,
        'repository_id' => 111,
        'owner' => 'orbit-collective',
        'name' => 'orbit',
    ]);

    expect(fn () => GithubRepository::query()->create([
        'project_integration_id' => $projectIntegration->id,
        'repository_id' => 111,
        'owner' => 'orbit-collective',
        'name' => 'orbit-renamed',
    ]))->toThrow(\Illuminate\Database\QueryException::class);
});
