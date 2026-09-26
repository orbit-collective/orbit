<?php

namespace App\Models;

use Illuminate\Contracts\Encryption\DecryptException;
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
        'github_last_sync_attempt_at',
        'github_last_failed_sync_at',
        'github_last_error_code',
        'github_last_error_message',
        'github_consecutive_failures',
        'github_pending_event_count',
        'github_revoked_at',
        'repository_id',
        'owner',
        'name',
        'mapping_type',
        'orbit_value',
        'external_value',
        'external_label',
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
     *
     * github_last_synced_at is the last *successful* sync (the whole cycle
     * completed with zero failures) — see GithubIntegrationSynchronizer.
     * github_last_sync_attempt_at is updated on every attempt regardless of
     * outcome, so a caller can tell "still trying" from "gave up".
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
        'github_last_sync_attempt_at' => 'datetime',
        'github_last_failed_sync_at' => 'datetime',
        'github_consecutive_failures' => 'integer',
        'github_pending_event_count' => 'integer',
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

    public function githubRepositories(): HasMany
    {
        return $this->hasMany(GithubRepository::class);
    }

    public function fieldMappings(): HasMany
    {
        return $this->hasMany(IntegrationFieldMapping::class);
    }

    /**
     * True when a github_relay_token is stored but can no longer be
     * decrypted with the app's current key (e.g. the key changed since it
     * was written). Checks the raw column, never the encrypted cast, so it
     * can never itself throw.
     */
    public function hasUnreadableGithubRelayToken(): bool
    {
        return $this->getRawOriginal('github_relay_token') !== null
            && $this->resolveGithubRelayToken() === null;
    }

    /**
     * Safe accessor for github_relay_token: every other direct access to
     * this attribute risks an uncaught DecryptException (and, before this
     * existed, did exactly that — crashing the whole Integrations settings
     * page) if the stored ciphertext can't be decrypted with the current
     * app key. Everywhere that needs the token should go through this
     * instead of the raw property.
     */
    public function resolveGithubRelayToken(): ?string
    {
        try {
            return $this->github_relay_token;
        } catch (DecryptException) {
            return null;
        }
    }
}
