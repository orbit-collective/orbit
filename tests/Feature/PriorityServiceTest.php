<?php

use App\Models\Priority;
use App\Models\Project;
use App\Services\PriorityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = app(PriorityService::class);
    $this->project = Project::factory()->create();
});

test('a project is seeded with High, Medium and Low in that order, Medium being the default', function () {
    $priorities = $this->service->getPriorities($this->project);

    expect($priorities->pluck('name')->all())->toBe(['High', 'Medium', 'Low'])
        ->and($priorities->pluck('position')->all())->toBe([0, 1, 2])
        ->and($priorities->firstWhere('is_default', true)->name)->toBe('Medium')
        ->and($this->project->fresh()->priorities_seeded_at)->not->toBeNull();
});

test('seeding happens once, so a deleted priority is not resurrected', function () {
    $this->service->getPriorities($this->project);
    Priority::where('project_id', $this->project->id)->where('name', 'Low')->delete();

    expect($this->service->getPriorities($this->project->fresh())->pluck('name')->all())->toBe(['High', 'Medium']);
});

test('defaultFor returns the project default and findByName ignores case', function () {
    expect($this->service->defaultFor($this->project)->name)->toBe('Medium')
        ->and($this->service->findByName($this->project, 'hIgH')->name)->toBe('High')
        ->and($this->service->findByName($this->project, 'urgent'))->toBeNull();
});

test('a new priority goes to the end of the scale', function () {
    $priority = $this->service->createPriority($this->project, ['name' => 'Urgent', 'color' => '#000000', 'icon' => 'Flame']);

    expect($priority->position)->toBe(3)
        ->and($priority->is_default)->toBeFalse()
        ->and($this->project->priorities()->count())->toBe(4);
    $this->assertDatabaseHas('activity_logs', ['project_id' => $this->project->id, 'body' => 'Created the "Urgent" priority']);
});

test('creating a priority can make it the only default', function () {
    $priority = $this->service->createPriority($this->project, ['name' => 'Normal', 'color' => '#111111', 'icon' => 'Flag', 'is_default' => true]);

    expect($priority->is_default)->toBeTrue()
        ->and($this->project->priorities()->where('is_default', true)->pluck('name')->all())->toBe(['Normal']);
});

test('names are unique per project regardless of case', function () {
    $this->service->createPriority($this->project, ['name' => 'high', 'color' => '#000000', 'icon' => 'Flag']);
})->throws(ValidationException::class);

test('the same name may exist in another project', function () {
    $other = Project::factory()->create();

    $this->service->createPriority($this->project, ['name' => 'Urgent', 'color' => '#000000', 'icon' => 'Flag']);
    $created = $this->service->createPriority($other, ['name' => 'Urgent', 'color' => '#000000', 'icon' => 'Flag']);

    expect($created->exists)->toBeTrue();
});

test('updating changes name, color and icon and keeps the position', function () {
    $this->service->ensureSystemPriorities($this->project);
    $high = $this->project->priorities()->where('name', 'High')->first();

    $updated = $this->service->updatePriority($this->project, $high, ['name' => 'Critical', 'color' => '#990000', 'icon' => 'Flame']);

    expect($updated->name)->toBe('Critical')
        ->and($updated->color)->toBe('#990000')
        ->and($updated->icon)->toBe('Flame')
        ->and($updated->position)->toBe(0);
});

test('a priority can be renamed to a different case of its own name', function () {
    $this->service->ensureSystemPriorities($this->project);
    $high = $this->project->priorities()->where('name', 'High')->first();

    expect($this->service->updatePriority($this->project, $high, ['name' => 'HIGH'])->name)->toBe('HIGH');
});

test('renaming onto another priority\'s name is rejected', function () {
    $this->service->ensureSystemPriorities($this->project);
    $high = $this->project->priorities()->where('name', 'High')->first();

    $this->service->updatePriority($this->project, $high, ['name' => 'low']);
})->throws(ValidationException::class);

test('making another priority the default moves the flag', function () {
    $this->service->ensureSystemPriorities($this->project);
    $high = $this->project->priorities()->where('name', 'High')->first();

    $this->service->updatePriority($this->project, $high, ['is_default' => true]);

    expect($this->project->priorities()->where('is_default', true)->pluck('name')->all())->toBe(['High']);
});

test('the default cannot be unset without choosing another', function () {
    $this->service->ensureSystemPriorities($this->project);
    $medium = $this->project->priorities()->where('name', 'Medium')->first();

    $this->service->updatePriority($this->project, $medium, ['is_default' => false]);
})->throws(ValidationException::class);

test('reordering rewrites the positions', function () {
    $ids = $this->service->getPriorities($this->project)->pluck('id', 'name');

    $this->service->reorder($this->project, [$ids['Low'], $ids['High'], $ids['Medium']]);

    expect($this->service->getPriorities($this->project->fresh())->pluck('name')->all())->toBe(['Low', 'High', 'Medium']);
});

test('reordering must list every priority exactly once', function (string $case) {
    $ids = $this->service->getPriorities($this->project)->pluck('id')->all();

    $this->service->reorder($this->project, match ($case) {
        'a missing id' => array_slice($ids, 0, 2),
        'a duplicate' => [$ids[0], $ids[0], $ids[1]],
        'a foreign id' => [$ids[0], $ids[1], 999999],
    });
})->with(['a missing id', 'a duplicate', 'a foreign id'])->throws(ValidationException::class);
