<?php

namespace App\Models;

use App\Enums\WorkflowStatusCategory;
use Database\Factories\WorkflowStatusFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkflowStatus extends Model
{
    /** @use HasFactory<WorkflowStatusFactory> */
    use HasFactory;

    protected $fillable = [
        'issue_type_id',
        'name',
        'color',
        'category',
        'sort_order',
        'is_initial',
    ];

    protected $casts = [
        'category' => WorkflowStatusCategory::class,
        'sort_order' => 'integer',
        'is_initial' => 'boolean',
    ];

    public function issueType(): BelongsTo
    {
        return $this->belongsTo(IssueType::class);
    }

    public function transitionsFrom(): HasMany
    {
        return $this->hasMany(WorkflowTransition::class, 'from_status_id');
    }

    public function transitionsTo(): HasMany
    {
        return $this->hasMany(WorkflowTransition::class, 'to_status_id');
    }

    public function issues(): HasMany
    {
        return $this->hasMany(Issue::class);
    }
}
