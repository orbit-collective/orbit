<?php

use App\Enums\WorkflowStatusCategory;
use App\Models\Issue;
use App\Models\Project;
use App\Services\IssueTypeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

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

test('container system types allow children while leaf ones do not', function () {
    $project = Project::factory()->create();

    $this->service->ensureSystemIssueTypes($project);

    expect($project->issueTypes()->where('name', 'Epic')->first()->allows_children)->toBeTrue()
        ->and($project->issueTypes()->where('name', 'Story')->first()->allows_children)->toBeTrue()
        ->and($project->issueTypes()->where('name', 'Bug')->first()->allows_children)->toBeFalse()
        ->and($project->issueTypes()->where('name', 'Spike')->first()->allows_children)->toBeFalse();
});

test('a system issue type with no workflow of its own falls back to the stock board', function () {
    $project = Project::factory()->create();

    $this->service->ensureSystemIssueTypes($project);

    $chore = $project->issueTypes()->where('name', 'Chore')->first();
    $statuses = $chore->statuses()->orderBy('sort_order')->get();

    expect($statuses->pluck('name')->all())->toBe(['To Do', 'In Progress', 'Done'])
        ->and($statuses->pluck('category')->all())->toBe([
            WorkflowStatusCategory::TODO, WorkflowStatusCategory::IN_PROGRESS, WorkflowStatusCategory::DONE,
        ])
        ->and($statuses->firstWhere('name', 'To Do')->is_initial)->toBeTrue();
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

test('it can create a custom issue type with its own default workflow and logs the change', function () {
    $project = Project::factory()->create();

    $issueType = $this->service->createIssueType($project, ['name' => 'Marketing Campaign', 'icon' => 'Megaphone', 'color' => '#ff0000']);

    $this->assertDatabaseHas('issue_types', ['id' => $issueType->id, 'name' => 'Marketing Campaign', 'is_system' => false]);
    expect($issueType->statuses)->toHaveCount(3);
    $this->assertDatabaseHas('activity_logs', ['project_id' => $project->id, 'body' => 'Created the "Marketing Campaign" issue type']);
});

test('it rejects creating an issue type with a name already used in the project', function () {
    $project = Project::factory()->create();
    $project->issueTypes()->create(['name' => 'Custom', 'icon' => 'Bug', 'color' => '#ff0000']);

    $this->service->createIssueType($project, ['name' => 'Custom', 'icon' => 'Bug', 'color' => '#000000']);
})->throws(ValidationException::class);

test('it can update an issue type, including a system type, and logs the change', function () {
    $project = Project::factory()->create();
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336', 'is_system' => true]);

    $updated = $this->service->updateIssueType($project, $issueType, ['name' => 'Defect', 'icon' => 'Bug', 'color' => '#111111']);

    expect($updated->name)->toBe('Defect')
        ->and($updated->color)->toBe('#111111');
    $this->assertDatabaseHas('activity_logs', ['project_id' => $project->id, 'body' => 'Updated the "Defect" issue type']);
});

test('it rejects renaming an issue type to a name already used by another issue type in the project', function () {
    $project = Project::factory()->create();
    $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);
    $typeToRename = $project->issueTypes()->create(['name' => 'Feature', 'icon' => 'Sparkles', 'color' => '#2196f3']);

    $this->service->updateIssueType($project, $typeToRename, ['name' => 'Bug', 'icon' => 'Sparkles', 'color' => '#2196f3']);
})->throws(ValidationException::class);

test('a system issue type cannot be deleted', function () {
    $project = Project::factory()->create();
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336', 'is_system' => true]);

    $this->service->deleteIssueType($project, $issueType);
})->throws(ValidationException::class);

test('a custom issue type still referenced by issues cannot be deleted', function () {
    $project = Project::factory()->create();
    $issueType = $project->issueTypes()->create(['name' => 'Custom', 'icon' => 'Bug', 'color' => '#f44336']);
    Issue::factory()->create(['project_id' => $project->id, 'issue_type_id' => $issueType->id]);

    $this->service->deleteIssueType($project, $issueType);
})->throws(ValidationException::class);

test('a custom issue type not referenced by any issue can be deleted and logs the change', function () {
    $project = Project::factory()->create();
    $issueType = $project->issueTypes()->create(['name' => 'Custom', 'icon' => 'Bug', 'color' => '#f44336']);

    $this->service->deleteIssueType($project, $issueType);

    $this->assertDatabaseMissing('issue_types', ['id' => $issueType->id]);
    $this->assertDatabaseHas('activity_logs', ['project_id' => $project->id, 'body' => 'Deleted the "Custom" issue type']);
});
