<?php

use App\Enums\IntegrationFieldMappingType;
use App\Models\AutomationRule;
use App\Models\IssueType;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Models\SavedFilter;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function migratePriorityReferences(): void
{
    (require database_path('migrations/2026_10_18_130000_migrate_priority_name_references.php'))->up();
}

test('template defaults take the canonical name of the scale', function () {
    $project = Project::factory()->create();
    $type = IssueType::factory()->create(['project_id' => $project->id]);
    $high = $type->templates()->create(['name' => 'H', 'description' => '', 'default_priority' => 'high']);
    $none = $type->templates()->create(['name' => 'N', 'description' => '', 'default_priority' => null]);
    $unknown = $type->templates()->create(['name' => 'U', 'description' => '', 'default_priority' => 'critical']);

    migratePriorityReferences();

    expect($high->fresh()->default_priority)->toBe('High')
        ->and($none->fresh()->default_priority)->toBeNull()
        ->and($unknown->fresh()->default_priority)->toBeNull();
});

test('Jira priority mappings and change-priority actions are canonicalised, others untouched', function () {
    $project = Project::factory()->create();
    $integration = ProjectIntegration::query()->create(['project_id' => $project->id, 'integration' => 'jira', 'enabled' => true]);
    $priority = $integration->fieldMappings()->create(['mapping_type' => IntegrationFieldMappingType::PRIORITY, 'external_value' => 'Highest', 'orbit_value' => 'high']);
    $status = $integration->fieldMappings()->create(['mapping_type' => IntegrationFieldMappingType::STATUS, 'external_value' => 'Done', 'orbit_value' => 'done']);
    $rule = AutomationRule::query()->create(['project_id' => $project->id, 'name' => 'R', 'trigger_type' => 'issue_created', 'enabled' => true]);
    $change = $rule->actions()->create(['type' => 'change_priority', 'params' => ['priority' => 'low'], 'sort_order' => 0]);
    $label = $rule->actions()->create(['type' => 'add_label', 'params' => ['label' => 'low'], 'sort_order' => 1]);

    migratePriorityReferences();

    expect($priority->fresh()->orbit_value)->toBe('High')
        ->and($status->fresh()->orbit_value)->toBe('done')
        ->and($change->fresh()->params)->toBe(['priority' => 'Low'])
        ->and($label->fresh()->params)->toBe(['label' => 'low']);
});

test('a saved filter\'s priority words become the project\'s priority ids', function () {
    $project = Project::factory()->create();
    $filter = SavedFilter::factory()->create(['project_id' => $project->id, 'query_params' => ['priority' => 'high,Low', 'labels' => '3']]);

    migratePriorityReferences();

    $ids = $project->priorities()->whereIn('name', ['High', 'Low'])->orderBy('position')->pluck('id')->implode(',');

    expect($filter->fresh()->query_params)->toBe(['priority' => $ids, 'labels' => '3']);
});

test('a saved filter whose words match nothing loses the priority condition', function () {
    $project = Project::factory()->create();
    $filter = SavedFilter::factory()->create(['project_id' => $project->id, 'query_params' => ['priority' => 'critical', 'labels' => '3']]);
    $untouched = SavedFilter::factory()->create(['project_id' => $project->id, 'query_params' => ['labels' => '3']]);

    migratePriorityReferences();

    expect($filter->fresh()->query_params)->toBe(['labels' => '3'])
        ->and($untouched->fresh()->query_params)->toBe(['labels' => '3']);
});

test('a project with only a saved filter is seeded so its words have somewhere to land', function () {
    $project = Project::factory()->create();
    SavedFilter::factory()->create(['project_id' => $project->id, 'query_params' => ['priority' => 'medium']]);
    expect($project->fresh()->priorities_seeded_at)->toBeNull();

    migratePriorityReferences();

    expect($project->fresh()->priorities_seeded_at)->not->toBeNull();
});

test('words are resolved within each filter\'s own project', function () {
    $first = Project::factory()->create();
    $second = Project::factory()->create();
    $filter = SavedFilter::factory()->create(['project_id' => $second->id, 'query_params' => ['priority' => 'high']]);

    migratePriorityReferences();

    $secondHigh = $second->priorities()->where('name', 'High')->value('id');

    expect($filter->fresh()->query_params['priority'])->toBe((string) $secondHigh)
        ->and($first->priorities()->where('name', 'High')->value('id'))->not->toBe($secondHigh);
});

test('running it twice changes nothing more', function () {
    $project = Project::factory()->create();
    $filter = SavedFilter::factory()->create(['project_id' => $project->id, 'query_params' => ['priority' => 'high']]);

    migratePriorityReferences();
    $once = $filter->fresh()->query_params;
    migratePriorityReferences();

    expect($filter->fresh()->query_params)->toBe($once);
});
