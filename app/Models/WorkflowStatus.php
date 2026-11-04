<?php

namespace App\Models;

use App\Enums\WorkflowStatusCategory;
use App\Models\Concerns\BroadcastsLiveChanges;
use App\Models\Concerns\BumpsIssueCache;
use Database\Factories\WorkflowStatusFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkflowStatus extends Model
{
    /** @use HasFactory<WorkflowStatusFactory> */
    use BroadcastsLiveChanges, BumpsIssueCache, HasFactory;

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

    /** Matches resources/js/types/Workflow.ts's WorkflowStatus. */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'issueTypeId' => $this->issue_type_id,
            'name' => $this->name,
            'color' => $this->color,
            'category' => $this->category->value,
            'isInitial' => $this->is_initial,
        ];
    }

    /** Statuses and transitions are part of the issue type's workflow, so clients re-read the type. */
    protected function liveChange(): ?array
    {
        $projectId = IssueType::query()->whereKey($this->issue_type_id)->value('project_id');

        return $projectId ? ['project' => $projectId, 'type' => 'issue-types', 'id' => $this->issue_type_id] : null;
    }
}
