<?php

namespace App\Models;

use App\Models\Concerns\BroadcastsLiveChanges;
use Database\Factories\WorkflowTransitionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkflowTransition extends Model
{
    /** @use HasFactory<WorkflowTransitionFactory> */
    use BroadcastsLiveChanges, HasFactory;

    protected $fillable = [
        'issue_type_id',
        'from_status_id',
        'to_status_id',
    ];

    public function issueType(): BelongsTo
    {
        return $this->belongsTo(IssueType::class);
    }

    public function fromStatus(): BelongsTo
    {
        return $this->belongsTo(WorkflowStatus::class, 'from_status_id');
    }

    public function toStatus(): BelongsTo
    {
        return $this->belongsTo(WorkflowStatus::class, 'to_status_id');
    }

    /** Matches resources/js/types/Workflow.ts's WorkflowTransition. */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'issueTypeId' => $this->issue_type_id,
            'fromStatusId' => $this->from_status_id,
            'toStatusId' => $this->to_status_id,
        ];
    }

    /** Statuses and transitions are part of the issue type's workflow, so clients re-read the type. */
    protected function liveChange(): ?array
    {
        $projectId = IssueType::query()->whereKey($this->issue_type_id)->value('project_id');

        return $projectId ? ['project' => $projectId, 'type' => 'issue-types', 'id' => $this->issue_type_id] : null;
    }
}
