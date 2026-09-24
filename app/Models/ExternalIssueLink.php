<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExternalIssueLink extends Model
{
    protected $fillable = [
        'issue_id',
        'project_integration_id',
        'external_id',
        'external_key',
        'external_url',
        'external_type',
        'pull_request_title',
        'source_branch',
        'target_branch',
        'status',
        'draft',
        'github_updated_at',
        'merged_at',
        'last_synced_at',
    ];

    protected $casts = [
        'last_synced_at' => 'datetime',
        'draft' => 'boolean',
        'github_updated_at' => 'datetime',
        'merged_at' => 'datetime',
    ];

    public function issue(): BelongsTo
    {
        return $this->belongsTo(Issue::class);
    }

    public function projectIntegration(): BelongsTo
    {
        return $this->belongsTo(ProjectIntegration::class);
    }
}
