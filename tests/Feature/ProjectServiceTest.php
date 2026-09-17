<?php

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\User;
use App\Repositories\ProjectRepository;
use App\Services\ActivityLogService;
use App\Services\ProjectService;
use App\Services\RoleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->projectRepository = Mockery::mock(ProjectRepository::class);
    $this->activityLogService = Mockery::mock(ActivityLogService::class);
    $this->roleService = Mockery::mock(RoleService::class);
    $this->service = new ProjectService($this->projectRepository, $this->activityLogService, $this->roleService);
});

test('it can create a project, attach the creator as owner and log activity', function () {
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

    $this->projectRepository->shouldReceive('attachMember')
        ->once()
        ->with($project, $user->id, RoleType::OWNER);

    $this->roleService->shouldReceive('syncSystemRoleForMember')
        ->once()
        ->with($project, $user->id, RoleType::OWNER);

    $this->activityLogService->shouldReceive('log')
        ->once()
        ->with(1, 'Created project: Test Project');

    $result = $this->service->createProject($data, $user->id);

    expect($result)->toBe($project);
});

test('it delegates checking for existing projects to the repository', function () {
    $this->projectRepository->shouldReceive('hasAnyProjectsForUser')
        ->once()
        ->with(5)
        ->andReturn(true);

    expect($this->service->hasAnyProjectsForUser(5))->toBeTrue();
});

test('deleting a project removes its uploaded attachment files', function () {
    Storage::fake('public');

    $project = new Project(['id' => 7, 'name' => 'Doomed']);
    Storage::disk('public')->put('attachments/7/shot.png', 'x');
    Storage::disk('public')->put('attachments/8/other.png', 'x');

    $this->projectRepository->shouldReceive('delete')->once()->with($project);

    $this->service->deleteProject($project);

    Storage::disk('public')->assertMissing('attachments/7/shot.png');
    Storage::disk('public')->assertExists('attachments/8/other.png');
});
