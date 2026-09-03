<?php

use App\Enums\IntegrationFieldMappingType;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Services\Integrations\FieldMappingResolverService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = app(FieldMappingResolverService::class);
    $this->projectIntegration = ProjectIntegration::query()->create([
        'project_id' => Project::factory()->create()->id,
        'integration' => 'jira',
        'enabled' => true,
    ]);
});

test('resolve returns the saved mapping when one exists', function () {
    $this->projectIntegration->fieldMappings()->create([
        'mapping_type' => IntegrationFieldMappingType::STATUS,
        'external_value' => 'To Do',
        'orbit_value' => 'open',
    ]);

    expect($this->service->resolve($this->projectIntegration, IntegrationFieldMappingType::STATUS, 'To Do'))
        ->toBe('open');
});

test('resolve falls back to the default status when unmapped', function () {
    expect($this->service->resolve($this->projectIntegration, IntegrationFieldMappingType::STATUS, 'Backlog'))
        ->toBe('open');
});

test('resolve falls back to the default priority when unmapped', function () {
    expect($this->service->resolve($this->projectIntegration, IntegrationFieldMappingType::PRIORITY, 'Urgent'))
        ->toBe('medium');
});

test('resolve returns null for an unmapped label, since labels have no default', function () {
    expect($this->service->resolve($this->projectIntegration, IntegrationFieldMappingType::LABEL, 'bug'))
        ->toBeNull();
});
