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

test('it defaults every discord option to false and no webhook url when nothing is stored', function () {
    $project = Project::factory()->create();

    expect($this->service->getSettings($project))->toBe([
        'discord' => [
            'enabled' => false,
            'webhookUrl' => null,
            'options' => ['issue-activity' => false, 'comment-activity' => false],
        ],
    ]);
});

test('it can save a valid discord webhook url, encrypted at rest', function () {
    $project = Project::factory()->create();
    $url = 'https://discord.com/api/webhooks/123456789012345678/aBcDeF-ghijk_LMNOP';

    $record = $this->service->updateSettings($project, 'discord', ['webhook_url' => $url]);

    expect($record->webhook_url)->toBe($url);
    $this->assertDatabaseMissing('project_integrations', ['webhook_url' => $url]);
    $this->assertDatabaseHas('activity_logs', [
        'project_id' => $project->id,
        'body' => 'Updated settings for the "discord" integration',
    ]);
});

test('it rejects a webhook url that does not look like a discord webhook', function () {
    $project = Project::factory()->create();

    $this->service->updateSettings($project, 'discord', ['webhook_url' => 'https://example.com/not-a-webhook']);
})->throws(ValidationException::class);

test('it clears the webhook url when given an empty string', function () {
    $project = Project::factory()->create();
    $this->service->updateSettings($project, 'discord', [
        'webhook_url' => 'https://discord.com/api/webhooks/123456789012345678/aBcDeF-ghijk_LMNOP',
    ]);

    $record = $this->service->updateSettings($project, 'discord', ['webhook_url' => '']);

    expect($record->webhook_url)->toBeNull();
});

test('it only persists known option keys for the integration and merges with existing options', function () {
    $project = Project::factory()->create();
    $this->service->updateSettings($project, 'discord', ['options' => ['issue-activity' => true]]);

    $record = $this->service->updateSettings($project, 'discord', [
        'options' => ['comment-activity' => true, 'not-a-real-option' => true],
    ]);

    expect($record->options)->toBe(['issue-activity' => true, 'comment-activity' => true]);
});

test('it rejects saving settings for an integration that is not available yet', function () {
    $project = Project::factory()->create();

    $this->service->updateSettings($project, 'slack', ['options' => ['issue-activity' => true]]);
})->throws(ValidationException::class);
