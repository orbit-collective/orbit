<?php

namespace App\Services\Integrations;

use App\Enums\IntegrationFieldMappingType;
use App\Models\ProjectIntegration;
use App\Repositories\IntegrationFieldMappingRepository;
use App\Services\PriorityService;

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
    /** A status mapping's value is a workflow status name or a category (todo, in_progress, done). */
    private const array DEFAULTS = [
        'status' => 'todo',
    ];

    public function __construct(
        protected IntegrationFieldMappingRepository $integrationFieldMappingRepository,
        protected PriorityService $priorityService,
    ) {}

    public function resolve(ProjectIntegration $projectIntegration, IntegrationFieldMappingType $mappingType, string $externalValue): ?string
    {
        $mapping = $this->integrationFieldMappingRepository->findFor($projectIntegration, $mappingType, $externalValue);

        if ($mapping) {
            return $mapping->orbit_value;
        }

        // An unmapped priority becomes the project's own default, which is
        // whatever its owners chose rather than a word Orbit decides.
        if ($mappingType === IntegrationFieldMappingType::PRIORITY) {
            return $this->priorityService->defaultFor($projectIntegration->project)?->name;
        }

        return self::DEFAULTS[$mappingType->value] ?? null;
    }
}
