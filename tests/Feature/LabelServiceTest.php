<?php

use App\Models\Project;
use App\Services\LabelService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = app(LabelService::class);
});

test('it seeds the 6 system labels for a project on first use', function () {
    $project = Project::factory()->create();

    $this->service->ensureSystemLabels($project);

    $this->assertDatabaseCount('labels', 6);
    expect($project->labels()->where('is_system', true)->pluck('name')->sort()->values()->all())
        ->toBe(['bug', 'chore', 'design', 'feature', 'performance', 'ux']);
});

test('ensuring system labels is idempotent and does not resurrect a deleted one', function () {
    $project = Project::factory()->create();
    $this->service->ensureSystemLabels($project);
    $project->labels()->where('name', 'chore')->delete();

    $this->service->ensureSystemLabels($project);

    $this->assertDatabaseCount('labels', 5);
    $this->assertDatabaseMissing('labels', ['project_id' => $project->id, 'name' => 'chore']);
});

test('getLabels seeds system labels and returns them for the project', function () {
    $project = Project::factory()->create();

    $labels = $this->service->getLabels($project);

    expect($labels)->toHaveCount(6);
});

test('it can create a custom label and logs the change', function () {
    $project = Project::factory()->create();

    $label = $this->service->createLabel($project, ['name' => 'urgent', 'color' => '#ff0000']);

    $this->assertDatabaseHas('labels', ['id' => $label->id, 'name' => 'urgent', 'is_system' => false]);
    $this->assertDatabaseHas('activity_logs', ['project_id' => $project->id, 'body' => 'Created the "urgent" label']);
});

test('it rejects creating a label with a name already used in the project', function () {
    $project = Project::factory()->create();
    $project->labels()->create(['name' => 'urgent', 'color' => '#ff0000']);

    $this->service->createLabel($project, ['name' => 'urgent', 'color' => '#000000']);
})->throws(ValidationException::class);

test('the same label name can be reused across different projects', function () {
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $projectA->labels()->create(['name' => 'urgent', 'color' => '#ff0000']);

    $label = $this->service->createLabel($projectB, ['name' => 'urgent', 'color' => '#000000']);

    $this->assertDatabaseHas('labels', ['id' => $label->id, 'project_id' => $projectB->id, 'name' => 'urgent']);
});

test('it can update a label, including a system label, and logs the change', function () {
    $project = Project::factory()->create();
    $label = $project->labels()->create(['name' => 'bug', 'color' => '#f44336', 'is_system' => true]);

    $updated = $this->service->updateLabel($project, $label, ['name' => 'defect', 'color' => '#111111', 'description' => null]);

    expect($updated->name)->toBe('defect')
        ->and($updated->color)->toBe('#111111');
    $this->assertDatabaseHas('activity_logs', ['project_id' => $project->id, 'body' => 'Updated the "defect" label']);
});

test('it rejects renaming a label to a name already used by another label in the project', function () {
    $project = Project::factory()->create();
    $project->labels()->create(['name' => 'bug', 'color' => '#f44336']);
    $labelToRename = $project->labels()->create(['name' => 'feature', 'color' => '#2196f3']);

    $this->service->updateLabel($project, $labelToRename, ['name' => 'bug', 'color' => '#2196f3']);
})->throws(ValidationException::class);

test('updating a label without changing its name does not conflict with itself', function () {
    $project = Project::factory()->create();
    $label = $project->labels()->create(['name' => 'bug', 'color' => '#f44336']);

    $updated = $this->service->updateLabel($project, $label, ['name' => 'bug', 'color' => '#000000']);

    expect($updated->color)->toBe('#000000');
});

test('it can delete a label, including a system label, and logs the change', function () {
    $project = Project::factory()->create();
    $label = $project->labels()->create(['name' => 'bug', 'color' => '#f44336', 'is_system' => true]);

    $this->service->deleteLabel($project, $label);

    $this->assertDatabaseMissing('labels', ['id' => $label->id]);
    $this->assertDatabaseHas('activity_logs', ['project_id' => $project->id, 'body' => 'Deleted the "bug" label']);
});
