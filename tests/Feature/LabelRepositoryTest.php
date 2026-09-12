<?php

use App\Models\Project;
use App\Repositories\LabelRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = new LabelRepository;
});

test('it can get the labels of a project ordered system-first then by name', function () {
    $project = Project::factory()->create();
    $project->labels()->create(['name' => 'zebra', 'color' => '#000000', 'is_system' => false]);
    $project->labels()->create(['name' => 'bug', 'color' => '#f44336', 'is_system' => true]);
    $project->labels()->create(['name' => 'apple', 'color' => '#ffffff', 'is_system' => false]);

    $labels = $this->repository->getForProject($project);

    expect($labels->pluck('name')->all())->toBe(['bug', 'apple', 'zebra']);
});

test('it does not return labels belonging to another project', function () {
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $otherProject->labels()->create(['name' => 'bug', 'color' => '#f44336']);

    expect($this->repository->getForProject($project))->toHaveCount(0);
});

test('it can find a label for a project by name', function () {
    $project = Project::factory()->create();
    $project->labels()->create(['name' => 'bug', 'color' => '#f44336']);

    expect($this->repository->findForProject($project, 'bug'))->not->toBeNull()
        ->and($this->repository->findForProject($project, 'missing'))->toBeNull();
});

test('it only creates a system label once per project', function () {
    $project = Project::factory()->create();
    $definition = ['name' => 'bug', 'color' => '#f44336', 'description' => 'Something is broken.'];

    $first = $this->repository->firstOrCreateSystemLabel($project, $definition);
    $second = $this->repository->firstOrCreateSystemLabel($project, $definition);

    expect($first->id)->toBe($second->id);
    $this->assertDatabaseCount('labels', 1);
});

test('it can create a label for a project', function () {
    $project = Project::factory()->create();

    $label = $this->repository->create($project, ['name' => 'urgent', 'color' => '#ff0000']);

    $this->assertDatabaseHas('labels', ['id' => $label->id, 'project_id' => $project->id, 'name' => 'urgent']);
});

test('it can update a label', function () {
    $project = Project::factory()->create();
    $label = $project->labels()->create(['name' => 'bug', 'color' => '#f44336']);

    $this->repository->update($label, ['color' => '#000000']);

    expect($label->refresh()->color)->toBe('#000000');
});

test('it can delete a label', function () {
    $project = Project::factory()->create();
    $label = $project->labels()->create(['name' => 'bug', 'color' => '#f44336']);

    $this->repository->delete($label);

    $this->assertDatabaseMissing('labels', ['id' => $label->id]);
});
