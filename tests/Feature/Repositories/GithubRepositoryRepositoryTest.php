<?php

use App\Models\GithubRepository;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Repositories\GithubRepositoryRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = app(GithubRepositoryRepository::class);
    $this->project = Project::factory()->create();
    $this->projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
    ]);
});

test('syncForIntegration creates repositories that do not exist yet', function () {
    $this->repository->syncForIntegration($this->projectIntegration, [
        ['id' => 1, 'owner' => 'orbit-collective', 'name' => 'orbit'],
        ['id' => 2, 'owner' => 'orbit-collective', 'name' => 'orbit-api'],
    ]);

    expect(GithubRepository::query()->count())->toBe(2);
});

test('syncForIntegration removes repositories no longer present', function () {
    $this->repository->create($this->projectIntegration, 1, 'orbit-collective', 'orbit');
    $this->repository->create($this->projectIntegration, 2, 'orbit-collective', 'orbit-api');

    $this->repository->syncForIntegration($this->projectIntegration, [
        ['id' => 1, 'owner' => 'orbit-collective', 'name' => 'orbit'],
    ]);

    expect(GithubRepository::query()->count())->toBe(1);
    expect(GithubRepository::query()->where('repository_id', 2)->exists())->toBeFalse();
});

test('syncForIntegration updates a renamed repository without deleting it', function () {
    $repository = $this->repository->create($this->projectIntegration, 1, 'orbit-collective', 'old-name');

    $this->repository->syncForIntegration($this->projectIntegration, [
        ['id' => 1, 'owner' => 'orbit-collective', 'name' => 'new-name'],
    ]);

    expect($repository->fresh()->name)->toBe('new-name');
    expect(GithubRepository::query()->count())->toBe(1);
});

test('findByRepositoryId finds a repository scoped to its integration', function () {
    $this->repository->create($this->projectIntegration, 1, 'orbit-collective', 'orbit');

    expect($this->repository->findByRepositoryId($this->projectIntegration, 1))->not->toBeNull();
    expect($this->repository->findByRepositoryId($this->projectIntegration, 999))->toBeNull();
});
