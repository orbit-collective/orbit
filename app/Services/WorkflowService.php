<?php

namespace App\Services;

use App\Models\IssueType;
use App\Models\WorkflowStatus;
use App\Models\WorkflowTransition;
use App\Repositories\WorkflowRepository;
use Illuminate\Validation\ValidationException;

class WorkflowService
{
    public function __construct(
        protected WorkflowRepository $workflowRepository,
        protected ActivityLogService $activityLogService,
    ) {}

    public function createStatus(IssueType $issueType, array $data): WorkflowStatus
    {
        $this->assertStatusNameAvailable($issueType, $data['name']);

        $status = $this->workflowRepository->createStatus($issueType, [
            'name' => $data['name'],
            'color' => $data['color'],
            'category' => $data['category'],
            'sort_order' => $this->workflowRepository->nextStatusSortOrder($issueType),
            'is_initial' => false,
        ]);

        $this->activityLogService->log($issueType->project_id, "Added the \"$status->name\" status to the \"$issueType->name\" workflow");

        return $status;
    }

    public function updateStatus(IssueType $issueType, WorkflowStatus $status, array $data): WorkflowStatus
    {
        if (array_key_exists('name', $data) && $data['name'] !== $status->name) {
            $this->assertStatusNameAvailable($issueType, $data['name']);
        }

        $status = $this->workflowRepository->updateStatus($status, $data);

        $this->activityLogService->log($issueType->project_id, "Updated the \"$status->name\" status in the \"$issueType->name\" workflow");

        return $status;
    }

    public function deleteStatus(IssueType $issueType, WorkflowStatus $status): void
    {
        if ($issueType->statuses()->count() <= 1) {
            throw ValidationException::withMessages([
                'name' => 'A workflow must keep at least one status.',
            ]);
        }

        if ($status->issues()->exists()) {
            throw ValidationException::withMessages([
                'name' => 'Move the issues using this status before deleting it.',
            ]);
        }

        $name = $status->name;
        $wasInitial = $status->is_initial;

        $this->workflowRepository->deleteStatus($status);

        if ($wasInitial) {
            $fallback = $issueType->statuses()->orderBy('sort_order')->first();
            if ($fallback) {
                $this->workflowRepository->updateStatus($fallback, ['is_initial' => true]);
            }
        }

        $this->activityLogService->log($issueType->project_id, "Removed the \"$name\" status from the \"$issueType->name\" workflow");
    }

    public function createTransition(IssueType $issueType, WorkflowStatus $from, WorkflowStatus $to): WorkflowTransition
    {
        if ($from->id === $to->id) {
            throw ValidationException::withMessages([
                'to_status_id' => 'A status cannot transition to itself.',
            ]);
        }

        if ($this->workflowRepository->transitionExists($issueType, $from->id, $to->id)) {
            throw ValidationException::withMessages([
                'to_status_id' => 'This transition already exists.',
            ]);
        }

        $transition = $this->workflowRepository->createTransition($issueType, $from, $to);

        $this->activityLogService->log($issueType->project_id, "Added a transition from \"$from->name\" to \"$to->name\" in the \"$issueType->name\" workflow");

        return $transition;
    }

    public function deleteTransition(IssueType $issueType, WorkflowTransition $transition): void
    {
        $fromName = $transition->fromStatus->name;
        $toName = $transition->toStatus->name;

        $this->workflowRepository->deleteTransition($transition);

        $this->activityLogService->log($issueType->project_id, "Removed the transition from \"$fromName\" to \"$toName\" in the \"$issueType->name\" workflow");
    }

    /**
     * Guards an issue's status change against the issue type's transition
     * graph. A null $fromStatusId (issue has no status yet) or a no-op
     * change is always allowed.
     */
    public function assertTransitionAllowed(IssueType $issueType, ?int $fromStatusId, int $toStatusId): void
    {
        if ($fromStatusId === null || $fromStatusId === $toStatusId) {
            return;
        }

        if (! $this->workflowRepository->transitionExists($issueType, $fromStatusId, $toStatusId)) {
            throw ValidationException::withMessages([
                'status' => 'This status transition is not allowed by this issue type\'s workflow.',
            ]);
        }
    }

    private function assertStatusNameAvailable(IssueType $issueType, string $name): void
    {
        if ($issueType->statuses()->where('name', $name)->exists()) {
            throw ValidationException::withMessages([
                'name' => 'A status with this name already exists in this workflow.',
            ]);
        }
    }
}
