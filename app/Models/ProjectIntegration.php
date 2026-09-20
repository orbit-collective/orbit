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
        'github_connection_id',
        'github_install_url',
        'github_relay_token',
        'github_status',
        'github_installation_id',
        'github_repository_id',
        'github_repository_owner',
        'github_repository_name',
        'github_connected_at',
        'github_last_synced_at',
        'github_revoked_at',
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
     *
     * github_relay_token is the orbit-api relay bearer token for this
     * project's GitHub connection — encrypted at rest for the same reason as
     * webhook_url, and never manually added to a service's Inertia payload.
     */
    protected $casts = [
        'enabled' => 'boolean',
        'webhook_url' => 'encrypted',
        'options' => 'array',
        'credentials' => 'encrypted:array',
        'github_relay_token' => 'encrypted',
        'github_installation_id' => 'integer',
        'github_repository_id' => 'integer',
        'github_connected_at' => 'datetime',
        'github_last_synced_at' => 'datetime',
        'github_revoked_at' => 'datetime',
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
