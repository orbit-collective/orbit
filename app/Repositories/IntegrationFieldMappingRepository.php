<?php

namespace App\Repositories;

use App\Enums\IntegrationFieldMappingType;
use App\Models\IntegrationFieldMapping;
use App\Models\ProjectIntegration;
use Illuminate\Database\Eloquent\Collection;

class IntegrationFieldMappingRepository
{
    public function getForProjectIntegration(ProjectIntegration $projectIntegration, IntegrationFieldMappingType $mappingType): Collection
    {
        return $projectIntegration->fieldMappings()
            ->where('mapping_type', $mappingType)
            ->get();
    }

    public function getAllForProjectIntegration(ProjectIntegration $projectIntegration): Collection
    {
        return $projectIntegration->fieldMappings()->get();
    }

    public function findFor(ProjectIntegration $projectIntegration, IntegrationFieldMappingType $mappingType, string $externalValue): ?IntegrationFieldMapping
    {
        return $projectIntegration->fieldMappings()
            ->where('mapping_type', $mappingType)
            ->where('external_value', $externalValue)
            ->first();
    }

    public function upsert(ProjectIntegration $projectIntegration, IntegrationFieldMappingType $mappingType, string $externalValue, string $orbitValue, ?string $externalLabel = null): IntegrationFieldMapping
    {
        return $projectIntegration->fieldMappings()->updateOrCreate(
            ['mapping_type' => $mappingType, 'external_value' => $externalValue],
            ['orbit_value' => $orbitValue, 'external_label' => $externalLabel],
        );
    }
}
