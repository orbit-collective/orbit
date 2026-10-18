<?php

use App\Enums\IntegrationFieldMappingType;
use App\Models\AutomationAction;
use App\Models\AutomationRule;
use App\Models\IntegrationFieldMapping;
use App\Models\Issue;
use App\Models\IssueType;
use App\Models\Priority;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Models\SavedFilter;
use App\Services\PriorityService;
use App\Support\Cache\CacheVersion;
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

function seededPriority(string $name): Priority
{
    return Priority::query()->where('name', $name)->firstOrFail();
}

test('deleting a priority moves its issues to the replacement and closes the gap in the order', function () {
    $this->service->ensureSystemPriorities($this->project);
    $issue = Issue::factory()->create(['project_id' => $this->project->id, 'priority' => 'high']);
    $high = seededPriority('High');
    $low = seededPriority('Low');

    $this->service->deletePriority($this->project, $high, $low);

    expect($issue->fresh()->priority->name)->toBe('Low')
        ->and($this->service->getPriorities($this->project)->pluck('position', 'name')->all())->toBe(['Medium' => 0, 'Low' => 1]);
    $this->assertDatabaseHas('activity_logs', ['project_id' => $this->project->id, 'body' => 'Deleted the "High" priority']);
});

test('without a replacement the issues are left without a priority', function () {
    $this->service->ensureSystemPriorities($this->project);
    $issue = Issue::factory()->create(['project_id' => $this->project->id, 'priority' => 'low']);

    $this->service->deletePriority($this->project, seededPriority('Low'));

    expect($issue->fresh()->priority_id)->toBeNull();
});

test('deleting the default passes the flag to the replacement, or else to the first priority', function () {
    $this->service->ensureSystemPriorities($this->project);
    $this->service->deletePriority($this->project, seededPriority('Medium'), seededPriority('Low'));

    expect($this->service->defaultFor($this->project)->name)->toBe('Low');

    $this->service->deletePriority($this->project, seededPriority('Low'));

    expect($this->service->defaultFor($this->project)->name)->toBe('High');
});

test('the last priority of a project cannot be deleted', function () {
    $this->service->ensureSystemPriorities($this->project);
    $this->service->deletePriority($this->project, seededPriority('High'));
    $this->service->deletePriority($this->project, seededPriority('Low'));

    $this->service->deletePriority($this->project, seededPriority('Medium'));
})->throws(ValidationException::class, 'at least one priority');

test('the replacement must be another priority of the same project', function () {
    $this->service->ensureSystemPriorities($this->project);
    $foreign = $this->service->getPriorities(Project::factory()->create())->first();

    expect(fn () => $this->service->deletePriority($this->project, seededPriority('Low'), $foreign))
        ->toThrow(ValidationException::class)
        ->and(fn () => $this->service->deletePriority($this->project, seededPriority('Low'), seededPriority('Low')))
        ->toThrow(ValidationException::class);
});

test('deleting a priority bumps the issue list version after the commit', function () {
    $this->service->ensureSystemPriorities($this->project);
    $before = CacheVersion::current(CacheVersion::ISSUES);

    $this->service->deletePriority($this->project, seededPriority('Low'));

    expect(CacheVersion::current(CacheVersion::ISSUES))->toBeGreaterThan($before);
});

test('renaming a priority rewrites its name in template defaults, Jira mappings and automation actions', function () {
    $this->service->ensureSystemPriorities($this->project);
    $type = IssueType::factory()->create(['project_id' => $this->project->id]);
    $template = $type->templates()->create(['name' => 'T', 'description' => '', 'default_priority' => 'high']);
    $integration = ProjectIntegration::query()->create(['project_id' => $this->project->id, 'integration' => 'jira', 'enabled' => true]);
    $mapping = $integration->fieldMappings()->create(['mapping_type' => IntegrationFieldMappingType::PRIORITY, 'external_value' => 'Highest', 'orbit_value' => 'High']);
    $rule = AutomationRule::query()->create(['project_id' => $this->project->id, 'name' => 'R', 'trigger_type' => 'issue_created', 'enabled' => true]);
    $action = $rule->actions()->create(['type' => 'change_priority', 'params' => ['priority' => 'HIGH'], 'sort_order' => 0]);
    $untouched = $type->templates()->create(['name' => 'U', 'description' => '', 'default_priority' => 'low']);

    $this->service->updatePriority($this->project, seededPriority('High'), ['name' => 'Urgent']);

    expect($template->fresh()->default_priority)->toBe('Urgent')
        ->and($mapping->fresh()->orbit_value)->toBe('Urgent')
        ->and($action->fresh()->params['priority'])->toBe('Urgent')
        ->and($untouched->fresh()->default_priority)->toBe('low');
});

test('deleting a priority clears or retargets the places that name it', function () {
    $this->service->ensureSystemPriorities($this->project);
    $type = IssueType::factory()->create(['project_id' => $this->project->id]);
    $template = $type->templates()->create(['name' => 'T', 'description' => '', 'default_priority' => 'Low']);
    $integration = ProjectIntegration::query()->create(['project_id' => $this->project->id, 'integration' => 'jira', 'enabled' => true]);
    $mapping = $integration->fieldMappings()->create(['mapping_type' => IntegrationFieldMappingType::PRIORITY, 'external_value' => 'Lowest', 'orbit_value' => 'Low']);
    $rule = AutomationRule::query()->create(['project_id' => $this->project->id, 'name' => 'R', 'trigger_type' => 'issue_created', 'enabled' => true]);
    $action = $rule->actions()->create(['type' => 'change_priority', 'params' => ['priority' => 'Low'], 'sort_order' => 0]);

    $this->service->deletePriority($this->project, seededPriority('Low'));

    expect($template->fresh()->default_priority)->toBeNull()
        ->and(IntegrationFieldMapping::query()->whereKey($mapping->id)->exists())->toBeFalse()
        ->and(AutomationAction::query()->whereKey($action->id)->exists())->toBeFalse();
});

test('with a replacement those places are retargeted to it', function () {
    $this->service->ensureSystemPriorities($this->project);
    $type = IssueType::factory()->create(['project_id' => $this->project->id]);
    $template = $type->templates()->create(['name' => 'T', 'description' => '', 'default_priority' => 'Low']);

    $this->service->deletePriority($this->project, seededPriority('Low'), seededPriority('Medium'));

    expect($template->fresh()->default_priority)->toBe('Medium');
});

test('other projects\' references to the same name are left alone', function () {
    $this->service->ensureSystemPriorities($this->project);
    $other = Project::factory()->create();
    $this->service->ensureSystemPriorities($other);
    $type = IssueType::factory()->create(['project_id' => $other->id]);
    $template = $type->templates()->create(['name' => 'T', 'description' => '', 'default_priority' => 'Low']);

    $this->service->deletePriority($this->project, $this->project->priorities()->where('name', 'Low')->first());

    expect($template->fresh()->default_priority)->toBe('Low');
});

test('a deleted priority is dropped from saved filters', function () {
    $this->service->ensureSystemPriorities($this->project);
    $high = seededPriority('High');
    $low = seededPriority('Low');
    $both = SavedFilter::factory()->create(['project_id' => $this->project->id, 'query_params' => ['priority' => "$high->id,$low->id", 'labels' => '1']]);
    $only = SavedFilter::factory()->create(['project_id' => $this->project->id, 'query_params' => ['priority' => (string) $low->id, 'labels' => '1']]);
    $unrelated = SavedFilter::factory()->create(['project_id' => $this->project->id, 'query_params' => ['priority' => (string) $high->id]]);

    $this->service->deletePriority($this->project, $low);

    expect($both->fresh()->query_params)->toBe(['priority' => (string) $high->id, 'labels' => '1'])
        ->and($only->fresh()->query_params)->toBe(['labels' => '1'])
        ->and($unrelated->fresh()->query_params)->toBe(['priority' => (string) $high->id]);
});
