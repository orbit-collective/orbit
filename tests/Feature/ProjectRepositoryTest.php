<?php

use App\Models\Project;
use App\Repositories\ProjectRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = new ProjectRepository();
});

test('it can get all projects', function () {
    Project::factory()->count(3)->create();

    $projects = $this->repository->getAll();

    expect($projects)->toHaveCount(3);
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
})->throws(\Illuminate\Database\Eloquent\ModelNotFoundException::class);

test('it reports no projects exist when the table is empty', function () {
    expect($this->repository->hasAnyProjects())->toBeFalse();
});

test('it reports projects exist once at least one has been created', function () {
    Project::factory()->create();

    expect($this->repository->hasAnyProjects())->toBeTrue();
});