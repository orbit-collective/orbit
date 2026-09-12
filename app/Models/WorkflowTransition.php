<?php

namespace App\Models;

use Database\Factories\WorkflowTransitionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkflowTransition extends Model
{
    /** @use HasFactory<WorkflowTransitionFactory> */
    use HasFactory;

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
}
