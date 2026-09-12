<?php

use App\Models\Label;
use App\Models\Project;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a factory-created label persists with the expected attribute types', function () {
    $label = Label::factory()->create();

    expect($label->exists)->toBeTrue()
        ->and($label->name)->toBeString()
        ->and($label->color)->toBeString()
        ->and($label->is_system)->toBeBool();
});

test('project() belongs to the project referenced by project_id', function () {
    $project = Project::factory()->create();
    $label = Label::factory()->create(['project_id' => $project->id]);

    expect($label->project())->toBeInstanceOf(BelongsTo::class)
        ->and($label->project->id)->toBe($project->id);
});

test('the system factory state marks a label as a system label', function () {
    $label = Label::factory()->system()->create();

    expect($label->is_system)->toBeTrue();
});

test('deleting a project cascades to delete its labels', function () {
    $project = Project::factory()->create();
    $label = Label::factory()->create(['project_id' => $project->id]);

    $project->delete();

    expect(Label::find($label->id))->toBeNull();
});

test('a project cannot have two labels with the same name', function () {
    $project = Project::factory()->create();
    Label::factory()->create(['project_id' => $project->id, 'name' => 'bug']);

    Label::factory()->create(['project_id' => $project->id, 'name' => 'bug']);
})->throws(QueryException::class);
