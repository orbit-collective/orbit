<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectIntegration extends Model
{
    protected $fillable = [
        'project_id',
        'integration',
        'enabled',
        'webhook_url',
        'options',
    ];

    /**
     * webhook_url is encrypted at rest (Laravel's `encrypted` cast) since it's a
     * bearer-token-like secret — anyone holding it can post to the channel it
     * points at.
     */
    protected $casts = [
        'enabled' => 'boolean',
        'webhook_url' => 'encrypted',
        'options' => 'array',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
