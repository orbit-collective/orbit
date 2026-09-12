<?php

namespace App\Repositories;

use App\Models\IssueType;
use App\Models\WorkflowStatus;
use App\Models\WorkflowTransition;
use Illuminate\Database\Eloquent\Collection;

class WorkflowRepository
{
    public function getStatusesForType(IssueType $issueType): Collection
    {
        return $issueType->statuses()->orderBy('sort_order')->get();
    }

    public function getTransitionsForType(IssueType $issueType): Collection
    {
        return $issueType->transitions()->get();
    }

    public function createStatus(IssueType $issueType, array $data): WorkflowStatus
    {
        return $issueType->statuses()->create($data);
    }

    public function updateStatus(WorkflowStatus $status, array $data): WorkflowStatus
    {
        $status->update($data);

        return $status;
    }

    public function deleteStatus(WorkflowStatus $status): void
    {
        $status->delete();
    }

    public function createTransition(IssueType $issueType, WorkflowStatus $from, WorkflowStatus $to): WorkflowTransition
    {
        return $issueType->transitions()->create([
            'from_status_id' => $from->id,
            'to_status_id' => $to->id,
        ]);
    }

    public function deleteTransition(WorkflowTransition $transition): void
    {
        $transition->delete();
    }

    public function transitionExists(IssueType $issueType, int $fromStatusId, int $toStatusId): bool
    {
        return $issueType->transitions()
            ->where('from_status_id', $fromStatusId)
            ->where('to_status_id', $toStatusId)
            ->exists();
    }
}
