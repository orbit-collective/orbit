<?php

namespace App\Services\Integrations;

use App\Enums\IntegrationFieldMappingType;
use App\Enums\IssueStatus;
use App\Models\ProjectIntegration;
use App\Repositories\IntegrationFieldMappingRepository;

/**
 * Resolves a raw external value (e.g. a Jira status/priority/label name)
 * against a project integration's configured field mappings into the Orbit
 * value it should become. Shared by every import integration — the mapping
 * problem ("the remote workflow is configurable, Orbit's isn't") is solved
 * once here rather than per-source.
 *
 * An unmapped value never hard-fails an import: it falls back to a sensible
 * default per mapping type so an incomplete mapping configuration still
 * produces usable issues.
 */
class FieldMappingResolverService
{
    private const array DEFAULTS = [
        'status' => IssueStatus::OPEN->value,
        'priority' => 'medium',
    ];

    public function __construct(protected IntegrationFieldMappingRepository $integrationFieldMappingRepository) {}

    public function resolve(ProjectIntegration $projectIntegration, IntegrationFieldMappingType $mappingType, string $externalValue): ?string
    {
        $mapping = $this->integrationFieldMappingRepository->findFor($projectIntegration, $mappingType, $externalValue);

        if ($mapping) {
            return $mapping->orbit_value;
        }

        return self::DEFAULTS[$mappingType->value] ?? null;
    }
}
