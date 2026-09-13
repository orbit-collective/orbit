<?php

use App\Models\Project;
use App\Services\IssueTypeService;
use App\Services\LabelService;
use App\Support\SystemIssueTypeDefaults;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function seededProject(): Project
{
    $project = Project::factory()->create();
    app(IssueTypeService::class)->ensureSystemIssueTypes($project);

    return $project->refresh();
}

test('each system issue type gets its own workflow rather than one shared board', function () {
    $project = seededProject();

    $bug = $project->issueTypes()->where('name', 'Bug')->first();
    $incident = $project->issueTypes()->where('name', 'Incident')->first();

    expect($bug->statuses()->orderBy('sort_order')->pluck('name')->all())
        ->toBe(['Reported', 'Triaged', 'Fixing', 'In Review', 'Fixed', "Won't Fix"])
        ->and($incident->statuses()->orderBy('sort_order')->pluck('name')->all())
        ->toBe(['Detected', 'Mitigating', 'Monitoring', 'Resolved']);
});

test('exactly one status per seeded workflow is the starting one', function () {
    $project = seededProject();

    foreach ($project->issueTypes()->get() as $issueType) {
        expect($issueType->statuses()->where('is_initial', true)->count())
            ->toBe(1, "{$issueType->name} should have exactly one initial status");
    }
});

test('a seeded workflow can always reach a terminal status from anywhere', function () {
    $project = seededProject();
    $bug = $project->issueTypes()->where('name', 'Bug')->first();
    $statuses = $bug->statuses()->get()->keyBy('name');
    $wontFix = $statuses["Won't Fix"];

    foreach ($statuses as $name => $status) {
        if ($name === "Won't Fix") {
            continue;
        }

        expect($bug->transitions()->where('from_status_id', $status->id)->where('to_status_id', $wontFix->id)->exists())
            ->toBeTrue("$name should be able to move to Won't Fix");
    }
});

test('every system issue type is seeded with a template and custom fields', function () {
    $project = seededProject();

    foreach (array_keys(SystemIssueTypeDefaults::all()) as $name) {
        $issueType = $project->issueTypes()->where('name', $name)->first();

        expect($issueType->templates()->count())->toBeGreaterThan(0, "$name should have a template")
            ->and($issueType->fields()->count())->toBeGreaterThan(0, "$name should have custom fields");
    }
});

test('a template only references labels the project actually has', function () {
    $project = seededProject();
    app(LabelService::class)->ensureSystemLabels($project);
    $labelNames = $project->labels()->pluck('name')->all();

    foreach ($project->issueTypes()->get() as $issueType) {
        foreach ($issueType->templates()->get() as $template) {
            foreach ($template->default_labels ?? [] as $label) {
                expect($labelNames)->toContain($label);
            }
        }
    }
});

test('container types are seeded with the specific child types they accept', function () {
    $project = seededProject();

    $epic = $project->issueTypes()->where('name', 'Epic')->first();
    $bug = $project->issueTypes()->where('name', 'Bug')->first();

    expect($epic->allows_children)->toBeTrue()
        ->and($epic->allowedChildTypes()->pluck('name')->all())->toContain('Story', 'Task')
        ->and($bug->allows_children)->toBeFalse()
        ->and($bug->allowedChildTypes()->count())->toBe(0);
});

test('the defaults are applied once and are not duplicated on a second read', function () {
    $project = seededProject();
    $bug = $project->issueTypes()->where('name', 'Bug')->first();
    $before = [$bug->statuses()->count(), $bug->fields()->count(), $bug->templates()->count()];

    app(IssueTypeService::class)->ensureSystemIssueTypes($project->refresh());

    expect([$bug->statuses()->count(), $bug->fields()->count(), $bug->templates()->count()])->toBe($before);
});

test('a project seeded before the defaults existed is upgraded in place', function () {
    $project = Project::factory()->create();
    app(IssueTypeService::class)->ensureSystemIssueTypes($project);

    // Rewind to the pre-defaults state: stock board, no fields or templates.
    $project->forceFill(['issue_type_defaults_version' => 0])->save();
    $bug = $project->issueTypes()->where('name', 'Bug')->first();
    $bug->fields()->delete();
    $bug->templates()->delete();

    app(IssueTypeService::class)->ensureSystemIssueTypes($project->refresh());

    expect($bug->fields()->count())->toBeGreaterThan(0)
        ->and($bug->templates()->count())->toBeGreaterThan(0);
});

test('a customized workflow is added to rather than replaced', function () {
    $project = Project::factory()->create();
    app(IssueTypeService::class)->ensureSystemIssueTypes($project);
    $task = $project->issueTypes()->where('name', 'Task')->first();
    $task->statuses()->create([
        'name' => 'Parked', 'color' => '#78716c', 'category' => 'todo', 'sort_order' => 9, 'is_initial' => false,
    ]);
    $project->forceFill(['issue_type_defaults_version' => 0])->save();

    app(IssueTypeService::class)->ensureSystemIssueTypes($project->refresh());

    expect($task->statuses()->pluck('name')->all())->toContain('Parked');
});
