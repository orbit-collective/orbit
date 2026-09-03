<?php

namespace App\Services;

use App\Events\IssueAssigned;
use App\Events\IssueCreated;
use App\Events\IssueUnassigned;
use App\Events\IssueUpdated;
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

    public function __construct(
        protected IssueRepository $issueRepository,
        protected ActivityLogService $activityLogService,
        protected UserService $userService,
    ) {}

    public function createIssue(array $data): Issue
    {
        $data['user_id'] = auth()->id();

        $issue = $this->issueRepository->store($data);
        $this->activityLogService->log($issue->project_id, "Added new task: #$issue->id");

        event(new IssueCreated($issue, auth()->user()));

        if ($issue->assignee_id && $issue->assignee_id !== auth()->id()) {
            event(new IssueAssigned($issue, $issue->assignee, auth()->user()));
        }

        return $issue;
    }

    /**
     * Same as createIssue(), but for issues created by an import job running
     * without a request/auth context: the importing user is passed
     * explicitly, and IssueCreated/IssueAssigned are deliberately NOT fired
     * per issue (would spam every project member's notifications and hammer
     * Discord's webhook during a bulk import) - the import orchestrator
     * fires a single summary event once the whole run completes instead.
     * An ActivityLog entry is still written per issue so its detail view's
     * history looks normal to anyone browsing it afterwards.
     */
    public function importIssue(array $data, User $importedBy): Issue
    {
        $data['user_id'] = $importedBy->id;

        $issue = $this->issueRepository->store($data);
        $this->activityLogService->log($issue->project_id, "Imported task: #$issue->id", $importedBy->id);

        return $issue;
    }

    /**
     * Overwrites an already-imported issue with fresh data from its source
     * of truth (e.g. Jira) - the remote system always wins on conflict, no
     * merge with whatever a user may have changed locally in Orbit since
     * the last sync. Writes one ActivityLog entry per changed issue (same
     * as a normal edit, so its history stays legible) but deliberately does
     * NOT fire IssueUpdated/notify assignees/actors, for the same
     * bulk-operation reason importIssue() doesn't fire IssueCreated: a
     * re-sync can touch hundreds of issues in one run.
     */
    public function syncImportedIssue(Issue $issue, array $data, User $syncedBy): Issue
    {
        $before = $this->snapshot($issue);

        $this->issueRepository->update($issue, $data);

        $changes = $this->diffChanges($before, $issue);

        if (empty($changes)) {
            return $issue;
        }

        $this->activityLogService->log(
            $issue->project_id,
            "Issue #$issue->id \"$issue->title\" synced from Jira: ".$this->summarize($changes),
            $syncedBy->id,
        );

        return $issue;
    }

    public function getAllForUser(int $userId): Collection
    {
        return $this->issueRepository->getAllForUser($userId);
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

    /**
     * The full, unpaginated set of a project's issues matching the given search
     * box/filter chips - used by views (calendar, upcoming-deadlines) that need
     * every matching issue rather than one table page.
     */
    public function getAllForProject(int $projectId, array $searchParams = [], array $filters = []): Collection
    {
        return $this->issueRepository->getForProject($projectId, $searchParams, $filters);
    }

    public function getProductivityTrendForUser(int $userId): array
    {
        return $this->issueRepository->getProductivityTrendForUser($userId);
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
        $oldName = $oldId ? ($this->userService->getUserById($oldId)?->name ?? 'someone') : 'Unassigned';
        $newName = $newId ? ($this->userService->getUserById($newId)?->name ?? 'someone') : 'Unassigned';

        // Quoted (like the status/priority values above) so a name containing
        // " to " or "; " can't be mistaken for the sentence's own delimiters.
        // Backslash-escaped in case the name itself contains a double quote -
        // the frontend parser unescapes it back when rendering.
        return sprintf(
            'assignee changed from "%s" to "%s"',
            $this->escapeForQuotedSegment($oldName),
            $this->escapeForQuotedSegment($newName),
        );
    }

    private function escapeForQuotedSegment(string $value): string
    {
        return str_replace(['\\', '"'], ['\\\\', '\\"'], $value);
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

    /**
     * Fires the events that describe an issue update: IssueUpdated always
     * (if there's an actor), and IssueAssigned/IssueUnassigned when the
     * assignee changed. The listener decides who gets notified about what —
     * this method just reports the facts.
     */
    private function notifyIssueUpdate(Issue $issue, ?User $actor, array $changes): void
    {
        if ($actor) {
            event(new IssueUpdated($issue, $actor, $changes));
        }

        $assigneeChange = $changes['assignee_id'] ?? null;

        if (! $assigneeChange) {
            return;
        }

        $actorId = $actor?->id;
        $oldAssigneeId = $assigneeChange['old'];
        $newAssigneeId = $assigneeChange['new'];
        $otherChanges = $changes;
        unset($otherChanges['assignee_id']);

        if ($oldAssigneeId && $oldAssigneeId !== $newAssigneeId && $oldAssigneeId !== $actorId) {
            $previousAssignee = $this->userService->getUserById($oldAssigneeId);

            if ($previousAssignee) {
                event(new IssueUnassigned($issue, $previousAssignee, $actor));
            }
        }

        if ($newAssigneeId && $newAssigneeId !== $actorId && $issue->assignee) {
            event(new IssueAssigned($issue, $issue->assignee, $actor, $otherChanges));
        }
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
