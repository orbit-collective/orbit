<?php

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\User;
use App\Repositories\ProjectRepository;
use App\Services\ActivityLogService;
use App\Services\ProjectService;
use App\Services\RoleService;
use App\Support\Cache\CacheVersion;
use Illuminate\Database\Eloquent\Collection;
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
        ->with($project, $user->id);

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

test('deleting a project removes its uploaded attachment files on both the current and legacy disks', function () {
    Storage::fake('local');
    Storage::fake('public');

    $project = new Project(['id' => 7, 'name' => 'Doomed']);
    Storage::disk('local')->put('attachments/7/shot.png', 'x');
    Storage::disk('local')->put('attachments/8/other.png', 'x');
    Storage::disk('public')->put('attachments/7/legacy.png', 'x');
    Storage::disk('public')->put('attachments/8/other.png', 'x');

    $this->projectRepository->shouldReceive('delete')->once()->with($project);

    $this->service->deleteProject($project);

    Storage::disk('local')->assertMissing('attachments/7/shot.png');
    Storage::disk('local')->assertExists('attachments/8/other.png');
    Storage::disk('public')->assertMissing('attachments/7/legacy.png');
    Storage::disk('public')->assertExists('attachments/8/other.png');
});

test('the project list is served from the cache until the membership version moves', function () {
    $projects = new Collection([new Project(['id' => 1, 'name' => 'Orbit'])]);

    $this->projectRepository->shouldReceive('getAllForUser')->twice()->with(5)->andReturn($projects);

    $this->service->getAllForUser(5);
    $this->service->getAllForUser(5);

    CacheVersion::bump(CacheVersion::MEMBERSHIP);

    $this->service->getAllForUser(5);
});

test('each user gets their own cached project list and has-projects answer', function () {
    $this->projectRepository->shouldReceive('getAllForUser')->once()->with(5)->andReturn(new Collection);
    $this->projectRepository->shouldReceive('getAllForUser')->once()->with(6)->andReturn(new Collection);
    $this->projectRepository->shouldReceive('hasAnyProjectsForUser')->once()->with(5)->andReturnTrue();
    $this->projectRepository->shouldReceive('hasAnyProjectsForUser')->once()->with(6)->andReturnFalse();

    $this->service->getAllForUser(5);
    $this->service->getAllForUser(6);
    $this->service->getAllForUser(5);

    expect($this->service->hasAnyProjectsForUser(5))->toBeTrue()
        ->and($this->service->hasAnyProjectsForUser(6))->toBeFalse()
        ->and($this->service->hasAnyProjectsForUser(5))->toBeTrue();
});

test('joining a project shows up in the cached project list straight away', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $service = app(ProjectService::class);

    expect($service->getAllForUser($user->id))->toHaveCount(0)
        ->and($service->hasAnyProjectsForUser($user->id))->toBeFalse();

    app(ProjectRepository::class)->attachMember($project, $user->id);

    expect($service->getAllForUser($user->id))->toHaveCount(1)
        ->and($service->hasAnyProjectsForUser($user->id))->toBeTrue();
});
