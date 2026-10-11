<?php

use App\Models\Issue;
use App\Models\IssueType;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkflowStatus;
use App\Services\CommandPaletteSearchService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = app(CommandPaletteSearchService::class);
    $this->user = User::factory()->create();
    $this->project = Project::factory()->create(['name' => 'Orbit']);
    $this->project->users()->attach($this->user->id, ['role' => 'member']);
});

test('a "#n" query is a pure number lookup', function () {
    $target = Issue::factory()->create(['project_id' => $this->project->id, 'title' => 'Target', 'number' => 42]);
    Issue::factory()->create(['project_id' => $this->project->id, 'title' => '42 reasons', 'number' => 7]);

    $result = $this->service->search($this->user->id, '#42');

    expect(collect($result['issues'])->pluck('id')->all())->toBe([$target->id])
        ->and($result['projects'])->toBe([]);
});

test('a bare number is a number lookup plus a title search, number first', function () {
    $exact = Issue::factory()->create(['project_id' => $this->project->id, 'title' => 'Exact', 'number' => 42]);
    $titled = Issue::factory()->create(['project_id' => $this->project->id, 'title' => '42 reasons', 'number' => 7]);

    $ids = collect($this->service->search($this->user->id, '42')['issues'])->pluck('id')->all();

    expect($ids)->toBe([$exact->id, $titled->id]);
});

test('free text searches issue titles and project names', function () {
    Issue::factory()->create(['project_id' => $this->project->id, 'title' => 'Orbit login bug']);

    $result = $this->service->search($this->user->id, 'orbit');

    expect($result['issues'])->toHaveCount(1)
        ->and($result['projects'])->toHaveCount(1)
        ->and($result['projects'][0]['name'])->toBe('Orbit');
});

test('a "#" before free text searches issues only', function () {
    Issue::factory()->create(['project_id' => $this->project->id, 'title' => 'Orbit login bug']);

    $result = $this->service->search($this->user->id, '#orbit');

    expect($result['issues'])->toHaveCount(1)
        ->and($result['projects'])->toBe([]);
});

test('blank or "#" only queries return nothing', function () {
    expect($this->service->search($this->user->id, '   '))->toBe(['issues' => [], 'projects' => []])
        ->and($this->service->search($this->user->id, '#'))->toBe(['issues' => [], 'projects' => []]);
});

test('results are capped at 8 issues and 5 projects', function () {
    Issue::factory()->count(12)->create(['project_id' => $this->project->id, 'title' => 'Common word']);
    foreach (range(1, 7) as $i) {
        Project::factory()->create(['name' => "Common $i"])->users()->attach($this->user->id, ['role' => 'member']);
    }

    $result = $this->service->search($this->user->id, 'common');

    expect($result['issues'])->toHaveCount(8)
        ->and($result['projects'])->toHaveCount(5);
});

test('an issue payload carries what the palette row renders', function () {
    $type = IssueType::factory()->create(['project_id' => $this->project->id, 'name' => 'Bug', 'icon' => 'Bug', 'color' => '#ff0000']);
    $status = WorkflowStatus::factory()->create(['issue_type_id' => $type->id, 'name' => 'In progress', 'color' => '#00ff00']);
    $issue = Issue::factory()->create([
        'project_id' => $this->project->id,
        'title' => 'Payload shape',
        'issue_type_id' => $type->id,
        'workflow_status_id' => $status->id,
    ]);

    $payload = $this->service->search($this->user->id, 'payload')['issues'][0];

    expect($payload)->toBe([
        'id' => $issue->id,
        'number' => $issue->number,
        'title' => 'Payload shape',
        'url' => "/projects/{$this->project->id}/issues/{$issue->id}",
        'project' => ['id' => $this->project->id, 'name' => 'Orbit'],
        'type' => ['name' => 'Bug', 'icon' => 'Bug', 'color' => '#ff0000'],
        'status' => ['name' => 'In progress', 'color' => '#00ff00'],
    ]);
});

test('an issue without a type or workflow status falls back gracefully', function () {
    Issue::factory()->create(['project_id' => $this->project->id, 'title' => 'Legacy', 'status' => 'open']);
    Issue::factory()->create(['project_id' => $this->project->id, 'title' => 'Legacy blank', 'status' => '']);

    $issues = collect($this->service->search($this->user->id, 'legacy')['issues'])->keyBy('title');

    expect($issues['Legacy']['type'])->toBeNull()
        ->and($issues['Legacy']['status'])->toBe(['name' => 'open', 'color' => null])
        ->and($issues['Legacy blank']['status'])->toBeNull();
});

test('a project payload carries a link to the project', function () {
    $payload = $this->service->search($this->user->id, 'orbit')['projects'][0];

    expect($payload)->toBe([
        'id' => $this->project->id,
        'name' => 'Orbit',
        'slug' => $this->project->slug,
        'color' => $this->project->color,
        'url' => "/projects/{$this->project->id}",
    ]);
});

test('non-member projects never appear', function () {
    $foreign = Project::factory()->create(['name' => 'Orbit Secret']);
    Issue::factory()->create(['project_id' => $foreign->id, 'title' => 'Orbit secret plans', 'number' => 1]);

    $text = $this->service->search($this->user->id, 'secret');
    $number = $this->service->search($this->user->id, '#1');

    expect($text['issues'])->toBe([])->and($text['projects'])->toBe([])
        ->and($number['issues'])->toBe([]);
});
