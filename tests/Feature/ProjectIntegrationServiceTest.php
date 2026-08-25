<?php

use App\Models\Project;
use App\Services\ProjectIntegrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = app(ProjectIntegrationService::class);
});

test('it defaults every available integration to disabled when nothing is stored', function () {
    $project = Project::factory()->create();

    expect($this->service->getStatuses($project))->toBe(['discord' => false]);
});

test('it can enable an available integration and logs the change', function () {
    $project = Project::factory()->create();

    $this->service->setEnabled($project, 'discord', true);

    $this->assertDatabaseHas('project_integrations', [
        'project_id' => $project->id,
        'integration' => 'discord',
        'enabled' => true,
    ]);
    $this->assertDatabaseHas('activity_logs', [
        'project_id' => $project->id,
        'body' => 'Enabled the "discord" integration',
    ]);
    expect($this->service->getStatuses($project))->toBe(['discord' => true]);
});

test('it can disable an integration and logs the change', function () {
    $project = Project::factory()->create();
    $this->service->setEnabled($project, 'discord', true);

    $this->service->setEnabled($project, 'discord', false);

    $this->assertDatabaseHas('project_integrations', [
        'project_id' => $project->id,
        'integration' => 'discord',
        'enabled' => false,
    ]);
    $this->assertDatabaseHas('activity_logs', [
        'project_id' => $project->id,
        'body' => 'Disabled the "discord" integration',
    ]);
});

test('it rejects enabling an integration that is not available yet', function () {
    $project = Project::factory()->create();

    $this->service->setEnabled($project, 'slack', true);
})->throws(ValidationException::class);

test('statuses for one project do not leak into another', function () {
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $this->service->setEnabled($projectA, 'discord', true);

    expect($this->service->getStatuses($projectA))->toBe(['discord' => true])
        ->and($this->service->getStatuses($projectB))->toBe(['discord' => false]);
});
