<?php

use App\Models\Project;
use App\Models\ProjectIntegration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function runLegacyStatusMigration(): void
{
    (require database_path('migrations/2026_10_15_130000_migrate_legacy_status_values.php'))->up();
}

function ruleWithConditions(int $projectId, array $conditions): int
{
    return DB::table('automation_rules')->insertGetId([
        'project_id' => $projectId,
        'name' => 'Rule '.uniqid(),
        'trigger_type' => 'issue.status_changed',
        'conditions' => json_encode($conditions),
        'enabled' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

function conditionsOf(int $ruleId): array
{
    return json_decode(DB::table('automation_rules')->where('id', $ruleId)->value('conditions'), true);
}

test('status conditions on the old words become category conditions', function () {
    $project = Project::factory()->create();
    $rule = ruleWithConditions($project->id, [
        ['field' => 'issue.status', 'operator' => 'equals', 'value' => 'closed'],
        ['field' => 'issue.previousStatus', 'operator' => 'not_equals', 'value' => 'open'],
        ['field' => 'issue.status', 'operator' => 'in', 'value' => ['open', 'in_progress']],
        ['field' => 'issue.priority', 'operator' => 'equals', 'value' => 'high'],
    ]);

    runLegacyStatusMigration();

    expect(conditionsOf($rule))->toBe([
        ['field' => 'issue.category', 'operator' => 'equals', 'value' => 'done'],
        ['field' => 'issue.previousCategory', 'operator' => 'not_equals', 'value' => 'todo'],
        ['field' => 'issue.category', 'operator' => 'in', 'value' => ['todo', 'in_progress']],
        ['field' => 'issue.priority', 'operator' => 'equals', 'value' => 'high'],
    ]);
});

test('a condition that names a real status is left alone', function () {
    $project = Project::factory()->create();
    $conditions = [['field' => 'issue.status', 'operator' => 'equals', 'value' => 'In Review']];
    $rule = ruleWithConditions($project->id, $conditions);

    runLegacyStatusMigration();

    expect(conditionsOf($rule))->toBe($conditions);
});

test('rules without conditions are untouched', function () {
    $project = Project::factory()->create();
    $id = DB::table('automation_rules')->insertGetId([
        'project_id' => $project->id, 'name' => 'Bare', 'trigger_type' => 'issue.status_changed',
        'conditions' => null, 'enabled' => true, 'created_at' => now(), 'updated_at' => now(),
    ]);

    runLegacyStatusMigration();

    expect(DB::table('automation_rules')->where('id', $id)->value('conditions'))->toBeNull();
});

test('saved filters on the old status words use the categories', function () {
    $project = Project::factory()->create();
    $insert = fn (array $params) => DB::table('saved_filters')->insertGetId([
        'project_id' => $project->id, 'name' => 'F', 'context' => 'issues',
        'query_params' => json_encode($params), 'created_at' => now(), 'updated_at' => now(),
    ]);
    $mixed = $insert(['status' => 'open,closed', 'priority' => 'high']);
    $already = $insert(['status' => 'todo']);
    $none = $insert(['labels' => 'bug']);

    runLegacyStatusMigration();

    $params = fn (int $id) => json_decode(DB::table('saved_filters')->where('id', $id)->value('query_params'), true);

    expect($params($mixed))->toBe(['status' => 'todo,done', 'priority' => 'high'])
        ->and($params($already))->toBe(['status' => 'todo'])
        ->and($params($none))->toBe(['labels' => 'bug']);
});

test('status import mappings on the old words use the categories', function () {
    $integration = ProjectIntegration::query()->create([
        'project_id' => Project::factory()->create()->id, 'integration' => 'jira', 'enabled' => true,
    ]);
    $map = fn (string $type, string $external, string $orbit) => DB::table('integration_field_mappings')->insert([
        'project_integration_id' => $integration->id, 'mapping_type' => $type,
        'external_value' => $external, 'orbit_value' => $orbit, 'created_at' => now(), 'updated_at' => now(),
    ]);
    $map('status', 'To Do', 'open');
    $map('status', 'Done', 'closed');
    $map('status', 'Doing', 'in_progress');
    $map('priority', 'Urgent', 'open');

    runLegacyStatusMigration();

    $orbit = fn (string $type, string $external) => DB::table('integration_field_mappings')
        ->where('mapping_type', $type)->where('external_value', $external)->value('orbit_value');

    expect($orbit('status', 'To Do'))->toBe('todo')
        ->and($orbit('status', 'Done'))->toBe('done')
        ->and($orbit('status', 'Doing'))->toBe('in_progress')
        ->and($orbit('priority', 'Urgent'))->toBe('open');
});
