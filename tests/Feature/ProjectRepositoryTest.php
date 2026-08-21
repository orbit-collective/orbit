<?php

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\User;
use App\Repositories\ProjectRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = new ProjectRepository;
});

test('it can get all projects for a user', function () {
    $user = User::factory()->create();
    $projects = Project::factory()->count(3)->create();

    foreach ($projects as $project) {
        $project->users()->attach($user->id, ['role' => RoleType::MEMBER->value]);
    }

    Project::factory()->create();

    $result = $this->repository->getAllForUser($user->id);

    expect($result)->toHaveCount(3);
});

test('it can find a project by slug', function () {
    $project = Project::factory()->create(['slug' => 'test-project']);

    $found = $this->repository->findBySlug('test-project');

    expect($found->id)->toBe($project->id);
});

test('it can store a new project', function () {
    $data = [
        'name' => 'New Project',
        'slug' => 'new-project',
        'description' => 'Test description',
        'color' => 'blue',
    ];

    $project = $this->repository->store($data);

    expect($project)->toBeInstanceOf(Project::class);
    $this->assertDatabaseHas('projects', ['name' => 'New Project']);
});

test('it throws exception when project slug is not found', function () {
    $this->repository->findBySlug('non-existent');
})->throws(ModelNotFoundException::class);

test('it reports no projects exist for a user when they belong to none', function () {
    $user = User::factory()->create();
    Project::factory()->create();

    expect($this->repository->hasAnyProjectsForUser($user->id))->toBeFalse();
});

test('it reports projects exist once the user has been attached to one', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->users()->attach($user->id, ['role' => RoleType::MEMBER->value]);

    expect($this->repository->hasAnyProjectsForUser($user->id))->toBeTrue();
});

test('it can attach a member with a role to a project', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();

    $this->repository->attachMember($project, $user->id, RoleType::ADMIN);

    expect($project->users()->first()->pivot->role)->toBe(RoleType::ADMIN->value);
});
