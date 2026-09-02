<?php

namespace App\Models;

use App\Enums\IntegrationFieldMappingType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntegrationFieldMapping extends Model
{
    protected $fillable = [
        'project_integration_id',
        'mapping_type',
        'external_value',
        'external_label',
        'orbit_value',
    ];

    protected $casts = [
        'mapping_type' => IntegrationFieldMappingType::class,
    ];

    public function projectIntegration(): BelongsTo
    {
        return $this->belongsTo(ProjectIntegration::class);
    }
}
