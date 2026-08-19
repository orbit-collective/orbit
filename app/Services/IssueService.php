<?php

namespace App\Services;

use App\Enums\Notifications\NotificationType;
use App\Models\Issue;
use App\Models\User;
use App\Repositories\IssueRepository;
use BackedEnum;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class IssueService
{
    /**
     * Issue fields that are tracked for change detection, keyed by their human-readable label.
     */
    private const array TRACKED_FIELDS = [
        'title' => 'title',
        'description' => 'description',
        'status' => 'status',
        'priority' => 'priority',
        'assignee_id' => 'assignee',
        'labels' => 'labels',
        'start_date' => 'start date',
        'end_date' => 'end date',
    ];

    /**
     * Maps a tracked field to the notification type that gates it, so each kind of change can be
     * enabled/disabled independently. Fields with no entry here (e.g. title, description) fall
     * back to the generic NotificationType::IssueUpdated.
     */
    private const array FIELD_NOTIFICATION_TYPES = [
        'status' => NotificationType::IssueStatusChanged,
        'priority' => NotificationType::IssuePriorityChanged,
        'labels' => NotificationType::IssueLabelsChanged,
        'start_date' => NotificationType::IssueDatesChanged,
        'end_date' => NotificationType::IssueDatesChanged,
    ];

    /**
     * Subject line per notification type, used for both the in-app title and the email subject.
     */
    private const array UPDATE_SUBJECTS = [
        'issue_status_changed' => 'status changed',
        'issue_priority_changed' => 'priority changed',
        'issue_labels_changed' => 'labels updated',
        'issue_dates_changed' => 'schedule updated',
        'issue_updated' => 'updated',
    ];

    public function __construct(
        protected IssueRepository $issueRepository,
        protected ActivityLogService $activityLogService,
        protected NotificationService $notificationService
    ) {}

    public function createIssue(array $data): Issue
    {
        $data['user_id'] = auth()->id();

        $issue = $this->issueRepository->store($data);
        $this->activityLogService->log($issue->project_id, "Added new task: #$issue->id");

        if ($issue->assignee_id && $issue->assignee_id !== auth()->id()) {
            $this->notificationService->notify(
                $issue->assignee_id,
                NotificationType::IssueAssigned,
                'info',
                'You were assigned to an issue',
                auth()->user()?->name." assigned you to \"$issue->title\" (#$issue->id).",
                $this->buildActionUrl($issue)
            );
        }

        return $issue;
    }

    public function getAll(): Collection
    {
        return $this->issueRepository->getAll();
    }

    public function getIssueWithRelations(int $id): Issue
    {
        return $this->issueRepository->findWithRelations($id);
    }

    public function updateIssue(Issue $issue, array $data): Issue
    {
        $before = $this->snapshot($issue);

        $this->issueRepository->update($issue, $data);

        $changes = $this->diffChanges($before, $issue);

        if (empty($changes)) {
            return $issue;
        }

        $actor = auth()->user();

        $this->activityLogService->log(
            $issue->project_id,
            "Issue #$issue->id \"$issue->title\" updated by ".($actor?->name ?? 'someone').': '.$this->summarize($changes)
        );

        $this->notifyIssueUpdate($issue, $actor, $changes);

        return $issue;
    }

    public function getAllByProjectID(int $projectID, array $sortParams = [], int $perPage = 20, array $searchParams = [], array $filters = []): LengthAwarePaginator
    {
        return $this->issueRepository->getAllPaginated($projectID, $perPage, $sortParams, $searchParams, $filters);
    }

    public function getProductivityTrend(): array
    {
        return $this->issueRepository->getProductivityTrend();
    }

    /**
     * Snapshot of the tracked fields, to be diffed against after an update (see summarizeChanges).
     */
    public function snapshot(Issue $issue): array
    {
        return $issue->only(array_keys(self::TRACKED_FIELDS));
    }

    /**
     * Human-readable summary of what changed on an issue, for use in flash messages.
     */
    public function summarizeChanges(Issue $issue, array $before): string
    {
        return $this->summarize($this->diffChanges($before, $issue));
    }

    private function diffChanges(array $before, Issue $issue): array
    {
        $changes = [];

        foreach (self::TRACKED_FIELDS as $field => $label) {
            $old = $before[$field] ?? null;
            $new = $issue->{$field};

            if ($this->normalize($field, $old) === $this->normalize($field, $new)) {
                continue;
            }

            $changes[$field] = [
                'old' => $old,
                'new' => $new,
                'text' => $this->describeChange($field, $old, $new),
            ];
        }

        return $changes;
    }

    private function normalize(string $field, mixed $value): ?string
    {
        if ($field === 'labels') {
            return $this->formatLabels($value, ',');
        }

        return $value === null ? null : (string) $value;
    }

    private function describeChange(string $field, mixed $old, mixed $new): string
    {
        return match ($field) {
            'title' => "title changed to \"$new\"",
            'description' => 'description was updated',
            'status' => "status changed from \"$old\" to \"$new\"",
            'priority' => "priority changed from \"$old\" to \"$new\"",
            'assignee_id' => $this->describeAssigneeChange($old, $new),
            'labels' => 'labels changed to ['.$this->formatLabels($new).']',
            'start_date' => 'start date changed to '.($new ?: 'none'),
            'end_date' => 'end date changed to '.($new ?: 'none'),
            default => "$field updated",
        };
    }

    private function describeAssigneeChange(?int $oldId, ?int $newId): string
    {
        $oldName = $oldId ? (User::find($oldId)?->name ?? 'someone') : 'Unassigned';
        $newName = $newId ? (User::find($newId)?->name ?? 'someone') : 'Unassigned';

        return "assignee changed from $oldName to $newName";
    }

    private function formatLabels(mixed $labels, string $glue = ', '): string
    {
        if (! $labels) {
            return $glue === ',' ? '' : 'none';
        }

        return collect($labels)
            ->map(fn ($label) => $label instanceof BackedEnum ? $label->value : (string) $label)
            ->sort()
            ->values()
            ->implode($glue);
    }

    private function summarize(array $changes): string
    {
        return implode('; ', array_map(fn ($change) => $change['text'], $changes));
    }

    private function buildActionUrl(Issue $issue): string
    {
        return route('projects.show', $issue->project_id).'?issue='.$issue->id;
    }

    /**
     * Notify the actor and any affected assignee(s) about an issue update.
     *
     * The acting user always gets a confirmation of their own change. If the issue is (or was)
     * assigned to someone else, that person is notified too, since the change affects their work.
     *
     * Changes are grouped by notification type (status, priority, labels, dates, or the generic
     * catch-all) so each kind of change can be toggled on/off independently, and so the subject
     * and message describe exactly what changed instead of a single generic "issue updated".
     */
    private function notifyIssueUpdate(Issue $issue, ?User $actor, array $changes): void
    {
        $actorId = $actor?->id;
        $actorName = $actor?->name ?? 'Someone';
        $actionUrl = $this->buildActionUrl($issue);

        if ($actorId) {
            foreach ($this->groupChangesByNotificationType($changes) as [$type, $groupChanges]) {
                $this->notificationService->notify(
                    $actorId,
                    $type,
                    'info',
                    $this->updateSubject($issue, $type),
                    "You updated \"$issue->title\" (#$issue->id): {$this->summarize($groupChanges)}.",
                    $actionUrl
                );
            }
        }

        $assigneeChange = $changes['assignee_id'] ?? null;
        $otherChanges = $changes;
        unset($otherChanges['assignee_id']);
        $otherSummary = $this->summarize($otherChanges);

        if ($assigneeChange) {
            $oldAssigneeId = $assigneeChange['old'];
            $newAssigneeId = $assigneeChange['new'];

            if ($oldAssigneeId && $oldAssigneeId !== $newAssigneeId && $oldAssigneeId !== $actorId) {
                $this->notificationService->notify(
                    $oldAssigneeId,
                    NotificationType::IssueAssigned,
                    'info',
                    'You were unassigned from an issue',
                    "$actorName unassigned you from \"$issue->title\" (#$issue->id).",
                    $actionUrl
                );
            }

            if ($newAssigneeId && $newAssigneeId !== $actorId) {
                $message = "$actorName assigned you to \"$issue->title\" (#$issue->id).";
                if ($otherSummary) {
                    $message .= " Also: $otherSummary.";
                }

                $this->notificationService->notify(
                    $newAssigneeId,
                    NotificationType::IssueAssigned,
                    'info',
                    'You were assigned to an issue',
                    $message,
                    $actionUrl
                );
            }

            return;
        }

        if ($otherChanges && $issue->assignee_id && $issue->assignee_id !== $actorId) {
            foreach ($this->groupChangesByNotificationType($otherChanges) as [$type, $groupChanges]) {
                $this->notificationService->notify(
                    $issue->assignee_id,
                    $type,
                    'info',
                    $this->updateSubject($issue, $type),
                    "$actorName updated \"$issue->title\" (#$issue->id), which is assigned to you: {$this->summarize($groupChanges)}.",
                    $actionUrl
                );
            }
        }
    }

    /**
     * Splits a change set into one bucket per notification type, preserving each field's change
     * data so every bucket can produce its own precise summary sentence.
     *
     * @return list<array{0: NotificationType, 1: array<string, array>}>
     */
    private function groupChangesByNotificationType(array $changes): array
    {
        $groupedByValue = [];

        foreach ($changes as $field => $change) {
            $type = self::FIELD_NOTIFICATION_TYPES[$field] ?? NotificationType::IssueUpdated;
            $groupedByValue[$type->value] ??= ['type' => $type, 'changes' => []];
            $groupedByValue[$type->value]['changes'][$field] = $change;
        }

        return array_map(
            fn ($group) => [$group['type'], $group['changes']],
            array_values($groupedByValue)
        );
    }

    private function updateSubject(Issue $issue, NotificationType $type): string
    {
        $suffix = self::UPDATE_SUBJECTS[$type->value] ?? 'updated';

        return "Issue #$issue->id $suffix";
    }

    public function deleteIssue(Issue $issue): void
    {
        $this->issueRepository->delete($issue);
        $this->activityLogService->log($issue->project_id, "Deleted issue #$issue->id \"$issue->title\"");
    }

    public function bulkDeleteIssues(array $issueIds): void
    {
        $issues = $this->issueRepository->getMany($issueIds);

        $this->issueRepository->bulkDelete($issueIds);

        foreach ($issues as $issue) {
            $this->activityLogService->log($issue->project_id, "Deleted issue #$issue->id \"$issue->title\"");
        }
    }
}
