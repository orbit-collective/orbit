<?php

use App\Models\Project;
use App\Models\User;
use App\Repositories\ProjectRepository;
use App\Services\ActivityLogService;
use App\Services\ProjectService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->projectRepository = Mockery::mock(ProjectRepository::class);
    $this->activityLogService = Mockery::mock(ActivityLogService::class);
    $this->service = new ProjectService($this->projectRepository, $this->activityLogService);
});

test('it can create a project and log activity', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $data = ['name' => 'Test Project', 'description' => 'Test Description'];
    $project = new Project(['id' => 1, 'name' => 'Test Project', 'slug' => 'test-project']);

    $this->projectRepository->shouldReceive('store')
        ->once()
        ->with(Mockery::on(function ($arg) {
            return $arg['name'] === 'Test Project' && $arg['slug'] === 'test-project';
        }))
        ->andReturn($project);

    $this->activityLogService->shouldReceive('log')
        ->once()
        ->with(1, 'Created project: Test Project');

    $result = $this->service->createProject($data);

    expect($result)->toBe($project);
});

test('it delegates checking for existing projects to the repository', function () {
    $this->projectRepository->shouldReceive('hasAnyProjects')
        ->once()
        ->andReturn(true);

    expect($this->service->hasAnyProjects())->toBeTrue();
});
