<?php

use App\Enums\WorkflowStatusCategory;
use App\Models\Issue;
use App\Models\Project;
use App\Services\IssueTypeService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = app(IssueTypeService::class);
});

test('it seeds the 16 system issue types for a project on first use', function () {
    $project = Project::factory()->create();

    $this->service->ensureSystemIssueTypes($project);

    $this->assertDatabaseCount('issue_types', 16);
    expect($project->issueTypes()->where('is_system', true)->pluck('name')->sort()->values()->all())
        ->toBe([
            'AI Task', 'Bug', 'Chore', 'Design', 'Documentation', 'Epic', 'Experiment',
            'Feature', 'Improvement', 'Incident', 'Infrastructure', 'Research',
            'Security', 'Spike', 'Story', 'Task',
        ]);
});

test('only the Epic system type allows children', function () {
    $project = Project::factory()->create();

    $this->service->ensureSystemIssueTypes($project);

    expect($project->issueTypes()->where('name', 'Epic')->first()->allows_children)->toBeTrue()
        ->and($project->issueTypes()->where('name', 'Task')->first()->allows_children)->toBeFalse();
});

test('each system issue type gets a default To Do/In Progress/Done workflow with full transitions', function () {
    $project = Project::factory()->create();

    $this->service->ensureSystemIssueTypes($project);

    $bug = $project->issueTypes()->where('name', 'Bug')->first();
    $statuses = $bug->statuses()->orderBy('sort_order')->get();

    expect($statuses->pluck('name')->all())->toBe(['To Do', 'In Progress', 'Done'])
        ->and($statuses->pluck('category')->all())->toBe([
            WorkflowStatusCategory::TODO, WorkflowStatusCategory::IN_PROGRESS, WorkflowStatusCategory::DONE,
        ])
        ->and($statuses->firstWhere('name', 'To Do')->is_initial)->toBeTrue()
        ->and($bug->transitions()->count())->toBe(6);
});

test('ensuring system issue types is idempotent and does not resurrect a deleted one', function () {
    $project = Project::factory()->create();
    $this->service->ensureSystemIssueTypes($project);
    $project->issueTypes()->where('name', 'Chore')->delete();

    $this->service->ensureSystemIssueTypes($project);

    $this->assertDatabaseCount('issue_types', 15);
    $this->assertDatabaseMissing('issue_types', ['project_id' => $project->id, 'name' => 'Chore']);
});

test('getIssueTypes seeds system issue types and returns them for the project', function () {
    $project = Project::factory()->create();

    $issueTypes = $this->service->getIssueTypes($project);

    expect($issueTypes)->toHaveCount(16);
});

test('it backfills pre-existing issues onto the Task type, mapping legacy status to the matching workflow status', function () {
    $project = Project::factory()->create();
    $openIssue = Issue::factory()->create(['project_id' => $project->id, 'status' => 'open', 'issue_type_id' => null, 'workflow_status_id' => null]);
    $inProgressIssue = Issue::factory()->create(['project_id' => $project->id, 'status' => 'in_progress', 'issue_type_id' => null, 'workflow_status_id' => null]);
    $closedIssue = Issue::factory()->create(['project_id' => $project->id, 'status' => 'closed', 'issue_type_id' => null, 'workflow_status_id' => null]);

    $this->service->ensureSystemIssueTypes($project);

    $taskType = $project->issueTypes()->where('name', 'Task')->first();
    $statusesByName = $taskType->statuses()->get()->keyBy('name');

    expect($openIssue->refresh()->issue_type_id)->toBe($taskType->id)
        ->and($openIssue->workflow_status_id)->toBe($statusesByName['To Do']->id)
        ->and($inProgressIssue->refresh()->workflow_status_id)->toBe($statusesByName['In Progress']->id)
        ->and($closedIssue->refresh()->workflow_status_id)->toBe($statusesByName['Done']->id);
});

test('it does not touch issues that already have an issue type assigned', function () {
    $project = Project::factory()->create();
    $this->service->ensureSystemIssueTypes($project);
    $bugType = $project->issueTypes()->where('name', 'Bug')->first();
    $bugStatus = $bugType->statuses()->first();

    $project->forceFill(['issue_types_seeded_at' => null])->save();
    $issue = Issue::factory()->create([
        'project_id' => $project->id,
        'issue_type_id' => $bugType->id,
        'workflow_status_id' => $bugStatus->id,
    ]);

    $this->service->ensureSystemIssueTypes($project);

    expect($issue->refresh()->issue_type_id)->toBe($bugType->id)
        ->and($issue->workflow_status_id)->toBe($bugStatus->id);
});
