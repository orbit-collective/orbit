<?php

use App\Models\Project;
use App\Services\Automation\AutomationDefaultsService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('seedGithubDefaultsForProject creates the default rules', function () {
    $project = Project::factory()->create();

    $created = app(AutomationDefaultsService::class)->seedGithubDefaultsForProject($project);

    expect($created)->toBe(2);
    expect($project->automationRules()->count())->toBe(2);

    $mergedRule = $project->automationRules()->where('trigger_type', 'github.pull_request.merged')->first();
    expect($mergedRule)->not->toBeNull();
    expect($mergedRule->actions()->first()->type)->toBe('change_status');
    expect($mergedRule->actions()->first()->params)->toBe(['category' => 'done']);
    expect($mergedRule->enabled)->toBeTrue();

    $openedRule = $project->automationRules()->where('trigger_type', 'github.pull_request.opened')->first();
    expect($openedRule)->not->toBeNull();
    expect($openedRule->actions()->first()->params)->toBe(['category' => 'in_progress']);
});

test('seedGithubDefaultsForProject is idempotent', function () {
    $project = Project::factory()->create();
    $service = app(AutomationDefaultsService::class);

    $service->seedGithubDefaultsForProject($project);
    $createdOnSecondCall = $service->seedGithubDefaultsForProject($project);

    expect($createdOnSecondCall)->toBe(0);
    expect($project->automationRules()->count())->toBe(2);
});

test('seedGithubDefaultsForProject does not duplicate a rule the project admin already named the same', function () {
    $project = Project::factory()->create();

    $project->automationRules()->create([
        'name' => 'Move to done when a pull request merges',
        'trigger_type' => 'issue.status_changed',
        'conditions' => [],
        'enabled' => false,
    ]);

    $created = app(AutomationDefaultsService::class)->seedGithubDefaultsForProject($project);

    expect($created)->toBe(1);
    expect($project->automationRules()->count())->toBe(2);
});
