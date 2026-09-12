<?php

use App\Models\Project;
use App\Repositories\IssueTypeRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = new IssueTypeRepository;
});

test('it can get the issue types of a project ordered system-first then by sort order then name', function () {
    $project = Project::factory()->create();
    $project->issueTypes()->create(['name' => 'Zebra Task', 'icon' => 'Bug', 'color' => '#000000', 'is_system' => false]);
    $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336', 'is_system' => true]);
    $project->issueTypes()->create(['name' => 'Apple Task', 'icon' => 'Bug', 'color' => '#ffffff', 'is_system' => false]);

    $issueTypes = $this->repository->getForProject($project);

    expect($issueTypes->pluck('name')->all())->toBe(['Bug', 'Apple Task', 'Zebra Task']);
});

test('it does not return issue types belonging to another project', function () {
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $otherProject->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);

    expect($this->repository->getForProject($project))->toHaveCount(0);
});

test('it can find an issue type for a project by name', function () {
    $project = Project::factory()->create();
    $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);

    expect($this->repository->findForProject($project, 'Bug'))->not->toBeNull()
        ->and($this->repository->findForProject($project, 'Missing'))->toBeNull();
});

test('it only creates a system issue type once per project', function () {
    $project = Project::factory()->create();
    $definition = ['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336', 'description' => 'Something is broken.'];

    $first = $this->repository->firstOrCreateSystemType($project, $definition);
    $second = $this->repository->firstOrCreateSystemType($project, $definition);

    expect($first->id)->toBe($second->id);
    $this->assertDatabaseCount('issue_types', 1);
});

test('it can create an issue type for a project', function () {
    $project = Project::factory()->create();

    $issueType = $this->repository->create($project, ['name' => 'Custom', 'icon' => 'Bug', 'color' => '#ff0000']);

    $this->assertDatabaseHas('issue_types', ['id' => $issueType->id, 'project_id' => $project->id, 'name' => 'Custom']);
});

test('it can update an issue type', function () {
    $project = Project::factory()->create();
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);

    $this->repository->update($issueType, ['color' => '#000000']);

    expect($issueType->refresh()->color)->toBe('#000000');
});

test('it can delete an issue type', function () {
    $project = Project::factory()->create();
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);

    $this->repository->delete($issueType);

    $this->assertDatabaseMissing('issue_types', ['id' => $issueType->id]);
});
