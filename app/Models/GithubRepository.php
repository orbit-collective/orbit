<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GithubRepository extends Model
{
    protected $fillable = [
        'project_integration_id',
        'repository_id',
        'owner',
        'name',
    ];

    protected $casts = [
        'repository_id' => 'integer',
    ];

    public function projectIntegration(): BelongsTo
    {
        return $this->belongsTo(ProjectIntegration::class);
    }
}
