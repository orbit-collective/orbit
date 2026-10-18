<?php

use App\Models\Issue;
use App\Models\Priority;
use App\Models\Project;
use App\Support\Cache\CacheVersion;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a new issue takes the project default priority', function () {
    $issue = Issue::factory()->create();

    expect($issue->priority->name)->toBe('Medium')
        ->and($issue->priority->is_default)->toBeTrue();
});

test('a priority is assigned by name, ignoring case', function () {
    $issue = Issue::factory()->create(['priority' => 'hIGh']);

    expect($issue->fresh()->priority->name)->toBe('High');
});

test('the project is not needed up front: a priority filled before project_id still resolves', function () {
    $project = Project::factory()->create();

    $issue = new Issue(['priority' => 'low', 'title' => 'Late project', 'project_id' => $project->id]);
    $issue->save();

    expect($issue->fresh()->priority->name)->toBe('Low');
});

test('a name the project has no priority for leaves the priority as it was', function () {
    $issue = Issue::factory()->create(['priority' => 'high']);

    $issue->update(['priority' => 'urgent']);

    expect($issue->fresh()->priority->name)->toBe('High');
});

test('assigning null clears the priority and a new issue keeps it cleared', function () {
    $cleared = Issue::factory()->create(['priority' => null]);
    $issue = Issue::factory()->create(['priority' => 'high']);
    $issue->update(['priority' => null]);

    expect($cleared->fresh()->priority)->toBeNull()
        ->and($issue->fresh()->priority)->toBeNull();
});

test('a priority is only looked up in the issue\'s own project', function () {
    $other = Project::factory()->create();
    $other->priorities()->create(['name' => 'Urgent', 'color' => '#000000', 'icon' => 'Flame', 'position' => 3]);
    $issue = Issue::factory()->create();

    $issue->update(['priority' => 'urgent']);

    expect($issue->fresh()->priority->name)->toBe('Medium');
});

test('renaming a priority shows the new name on every issue at once', function () {
    $project = Project::factory()->create();
    $issues = Issue::factory()->count(2)->create(['project_id' => $project->id, 'priority' => 'high']);

    $project->priorities()->where('name', 'High')->first()->update(['name' => 'Urgent']);

    expect($issues->map(fn ($issue) => $issue->fresh()->priority->name)->unique()->all())->toBe(['Urgent']);
});

test('deleting a priority leaves its issues without one', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'priority' => 'low']);

    $project->priorities()->where('name', 'Low')->first()->delete();

    expect($issue->fresh()->priority_id)->toBeNull();
});

test('the payload carries the priority name and its details', function () {
    $issue = Issue::factory()->create(['priority' => 'high']);

    $payload = $issue->fresh()->toArray();

    expect($payload['priority'])->toBe('High')
        ->and($payload['priorityDetails'])->toMatchArray(['name' => 'High', 'color' => '#f44336', 'icon' => 'SignalHigh', 'position' => 0])
        ->and($payload['priority_id'])->toBe($issue->priority_id);
});

test('an issue without a priority serialises both as null', function () {
    $payload = Issue::factory()->create(['priority' => null])->fresh()->toArray();

    expect($payload['priority'])->toBeNull()
        ->and($payload['priorityDetails'])->toBeNull();
});

test('editing a priority retires the cached issue lists', function () {
    $priority = Priority::factory()->create();
    $before = CacheVersion::current(CacheVersion::ISSUES);

    $priority->update(['color' => '#123456']);

    expect(CacheVersion::current(CacheVersion::ISSUES))->toBeGreaterThan($before);
});
