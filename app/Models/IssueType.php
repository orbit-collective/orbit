<?php

namespace App\Models;

use Database\Factories\IssueTypeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IssueType extends Model
{
    /** @use HasFactory<IssueTypeFactory> */
    use HasFactory;

    protected $fillable = [
        'project_id',
        'name',
        'icon',
        'color',
        'description',
        'is_system',
        'allows_children',
        'required_fields',
        'restricted_role_types',
        'sort_order',
    ];

    protected $casts = [
        'is_system' => 'boolean',
        'allows_children' => 'boolean',
        'required_fields' => 'array',
        'restricted_role_types' => 'array',
        'sort_order' => 'integer',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function statuses(): HasMany
    {
        return $this->hasMany(WorkflowStatus::class);
    }

    public function transitions(): HasMany
    {
        return $this->hasMany(WorkflowTransition::class);
    }

    public function templates(): HasMany
    {
        return $this->hasMany(IssueTypeTemplate::class);
    }

    public function issues(): HasMany
    {
        return $this->hasMany(Issue::class);
    }
}
