<?php

use App\Models\Issue;
use App\Models\IssueType;
use App\Models\Project;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a factory-created issue type persists with the expected attribute types', function () {
    $issueType = IssueType::factory()->create();

    expect($issueType->exists)->toBeTrue()
        ->and($issueType->name)->toBeString()
        ->and($issueType->icon)->toBeString()
        ->and($issueType->color)->toBeString()
        ->and($issueType->is_system)->toBeBool()
        ->and($issueType->allows_children)->toBeBool()
        ->and($issueType->required_fields)->toBeArray()
        ->and($issueType->restricted_role_types)->toBeArray();
});

test('project() belongs to the project referenced by project_id', function () {
    $project = Project::factory()->create();
    $issueType = IssueType::factory()->create(['project_id' => $project->id]);

    expect($issueType->project())->toBeInstanceOf(BelongsTo::class)
        ->and($issueType->project->id)->toBe($project->id);
});

test('the system factory state marks an issue type as system', function () {
    $issueType = IssueType::factory()->system()->create();

    expect($issueType->is_system)->toBeTrue();
});

test('the allowsChildren factory state marks an issue type as allowing children', function () {
    $issueType = IssueType::factory()->allowsChildren()->create();

    expect($issueType->allows_children)->toBeTrue();
});

test('statuses(), transitions(), templates() and issues() are has-many relations', function () {
    $issueType = IssueType::factory()->create();

    expect($issueType->statuses())->toBeInstanceOf(HasMany::class)
        ->and($issueType->transitions())->toBeInstanceOf(HasMany::class)
        ->and($issueType->templates())->toBeInstanceOf(HasMany::class)
        ->and($issueType->issues())->toBeInstanceOf(HasMany::class);
});

test('deleting a project cascades to delete its issue types', function () {
    $project = Project::factory()->create();
    $issueType = IssueType::factory()->create(['project_id' => $project->id]);

    $project->delete();

    expect(IssueType::find($issueType->id))->toBeNull();
});

test('a project cannot have two issue types with the same name', function () {
    $project = Project::factory()->create();
    IssueType::factory()->create(['project_id' => $project->id, 'name' => 'Bug']);

    IssueType::factory()->create(['project_id' => $project->id, 'name' => 'Bug']);
})->throws(QueryException::class);

test('an issue type referenced by an issue cannot be deleted at the database level', function () {
    $issueType = IssueType::factory()->create();
    Issue::factory()->create(['issue_type_id' => $issueType->id]);

    $issueType->delete();
})->throws(QueryException::class);
