<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectIntegration extends Model
{
    protected $fillable = [
        'project_id',
        'integration',
        'enabled',
        'webhook_url',
        'options',
        'credentials',
    ];

    /**
     * webhook_url is encrypted at rest (Laravel's `encrypted` cast) since it's a
     * bearer-token-like secret — anyone holding it can post to the channel it
     * points at.
     *
     * credentials holds arbitrary import-integration secrets (e.g. Jira's
     * instance_url/email/api_token) as an opaque encrypted JSON blob, so a
     * future OAuth-based importer can store different keys without another
     * migration.
     */
    protected $casts = [
        'enabled' => 'boolean',
        'webhook_url' => 'encrypted',
        'options' => 'array',
        'credentials' => 'encrypted:array',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function externalIssueLinks(): HasMany
    {
        return $this->hasMany(ExternalIssueLink::class);
    }

    public function fieldMappings(): HasMany
    {
        return $this->hasMany(IntegrationFieldMapping::class);
    }
}
