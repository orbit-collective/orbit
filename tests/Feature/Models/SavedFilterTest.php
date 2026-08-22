<?php

use App\Models\Project;
use App\Models\SavedFilter;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a factory-created saved filter persists with the expected attributes', function () {
    $filter = SavedFilter::factory()->create(['project_id' => Project::factory()]);

    expect($filter->exists)->toBeTrue()
        ->and($filter->name)->toBeString()
        ->and($filter->query_params)->toBeArray();
});

test('mass assignment via fillable creates a saved filter', function () {
    $project = Project::factory()->create();

    $filter = SavedFilter::create([
        'project_id' => $project->id,
        'name' => 'My filter',
        'context' => 'project_issues',
        'query_params' => ['status' => 'open'],
    ]);

    $this->assertDatabaseHas('saved_filters', [
        'id' => $filter->id,
        'project_id' => $project->id,
        'name' => 'My filter',
    ]);
});

test('query_params is cast to an array', function () {
    $filter = SavedFilter::factory()->create([
        'project_id' => Project::factory(),
        'query_params' => ['status' => 'open', 'priority' => 'high'],
    ]);

    $fresh = $filter->fresh();

    expect($fresh->query_params)->toBeArray()
        ->and($fresh->query_params['status'])->toBe('open')
        ->and($fresh->query_params['priority'])->toBe('high');
});

test('project() belongs to the project referenced by project_id', function () {
    $project = Project::factory()->create();
    $filter = SavedFilter::factory()->create(['project_id' => $project->id]);

    expect($filter->project())->toBeInstanceOf(BelongsTo::class)
        ->and($filter->project->id)->toBe($project->id);
});

test('deleting the project cascades to delete its saved filters', function () {
    $project = Project::factory()->create();
    $filter = SavedFilter::factory()->create(['project_id' => $project->id]);

    $project->delete();

    $this->assertDatabaseMissing('saved_filters', ['id' => $filter->id]);
});
