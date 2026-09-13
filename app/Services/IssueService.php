<?php

namespace App\Services;

use App\Events\IssueAssigned;
use App\Events\IssueCreated;
use App\Events\IssueUnassigned;
use App\Events\IssueUpdated;
use App\Models\Issue;
use App\Models\IssueType;
use App\Models\Project;
use App\Models\User;
use App\Repositories\IssueRepository;
use BackedEnum;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

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
        'parent_id' => 'parent',
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

        if ($issue->parent_id) {
            $this->activityLogService->log($issue->project_id, "Issue #$issue->id added as a sub-issue of #$issue->parent_id");
        }

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

    /**
     * The issue's ancestors ordered root-first, for the detail view's
     * breadcrumb. Depth is capped the same way assertValidParent() caps its
     * cycle walk, so a hierarchy corrupted outside the app can't hang the
     * request.
     *
     * @return Collection<int, Issue>
     */
    public function ancestorsOf(Issue $issue): Collection
    {
        $ancestors = collect();
        $current = $issue;
        $depth = 0;

        while ($current->parent_id && $depth < 50) {
            $parent = $this->issueRepository->findBasic($current->parent_id);

            if (! $parent) {
                break;
            }

            $ancestors->prepend($parent);
            $current = $parent;
            $depth++;
        }

        return $ancestors;
    }

    /**
     * Best-effort preview of the id the next created issue will get, so the
     * inline quick-add row can show it instead of a blank cell. Only a hint -
     * a concurrent create wins the actual id, and nothing depends on it.
     */
    public function peekNextIssueId(): int
    {
        return $this->issueRepository->maxId() + 1;
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
            'parent_id' => $new ? "moved under issue #$new" : 'removed from its parent issue',
            default => "$field updated",
        };
    }

    private function describeAssigneeChange(?int $oldId, ?int $newId): string
    {
        // Quoted (like the status/priority values above) so a name containing
        // " to " or "; " can't be mistaken for the sentence's own delimiters.
        // Backslash-escaped in case the name itself contains a double quote -
        // the frontend parser unescapes it back when rendering. The trailing
        // "#id" (only present for a real user, never for "Unassigned") lets
        // the frontend resolve the exact user by id instead of by name, so
        // two project members who happen to share a display name don't get
        // each other's avatar.
        return sprintf(
            'assignee changed from "%s"%s to "%s"%s',
            $this->escapeForQuotedSegment($this->assigneeName($oldId)),
            $this->assigneeIdSuffix($oldId),
            $this->escapeForQuotedSegment($this->assigneeName($newId)),
            $this->assigneeIdSuffix($newId),
        );
    }

    private function assigneeName(?int $userId): string
    {
        if (! $userId) {
            return 'Unassigned';
        }

        return $this->userService->getUserById($userId)?->name ?? 'someone';
    }

    private function assigneeIdSuffix(?int $userId): string
    {
        return $userId ? "#$userId" : '';
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

    /**
     * Guards issues.parent_id: the parent must exist in the same project,
     * its issue type must allow children (and, if that type has specific
     * allowed child types configured, $childIssueTypeId must be one of
     * them - an empty configured set means "any type is allowed"), an
     * issue can't be its own parent, and (when updating an existing issue)
     * the new parent can't be a descendant of that issue, which would
     * create a cycle.
     */
    public function assertValidParent(Project $project, ?int $parentId, ?int $childIssueTypeId = null, ?int $excludingIssueId = null): void
    {
        if ($parentId === null) {
            $this->assertTypeAllowedAtTopLevel($project, $childIssueTypeId);

            return;
        }

        if ($parentId === $excludingIssueId) {
            throw ValidationException::withMessages([
                'parent_id' => 'An issue cannot be its own parent.',
            ]);
        }

        $parent = Issue::query()->with('issueType.allowedChildTypes')->find($parentId);

        if (! $parent || $parent->project_id !== $project->id) {
            throw ValidationException::withMessages([
                'parent_id' => 'The selected parent issue does not exist in this project.',
            ]);
        }

        $parentType = $parent->issueType;

        if (! $parentType?->allows_children) {
            throw ValidationException::withMessages([
                'parent_id' => "The \"$parentType?->name\" issue type does not allow sub-issues.",
            ]);
        }

        $allowedChildTypeIds = $parentType->allowedChildTypes->pluck('id');

        if (
            $childIssueTypeId !== null &&
            $allowedChildTypeIds->isNotEmpty() &&
            ! $allowedChildTypeIds->contains($childIssueTypeId)
        ) {
            throw ValidationException::withMessages([
                'parent_id' => "The \"$parentType->name\" issue type only accepts specific issue types as sub-issues.",
            ]);
        }

        if ($excludingIssueId === null) {
            return;
        }

        $ancestor = $parent;
        $depth = 0;

        while ($ancestor && $depth < 50) {
            if ($ancestor->id === $excludingIssueId) {
                throw ValidationException::withMessages([
                    'parent_id' => 'This would create a circular hierarchy.',
                ]);
            }

            $ancestor = $ancestor->parent_id ? Issue::query()->find($ancestor->parent_id) : null;
            $depth++;
        }
    }

    /**
     * Types with is_top_level off exist only as sub-issues (e.g. a Spike
     * lives inside an Epic), so they cannot be created as a root row - which
     * is what keeps the "New issue" picker down to the handful of types a
     * project actually starts work from.
     */
    private function assertTypeAllowedAtTopLevel(Project $project, ?int $childIssueTypeId): void
    {
        if ($childIssueTypeId === null) {
            return;
        }

        $type = IssueType::query()->where('project_id', $project->id)->find($childIssueTypeId);

        if ($type && ! $type->is_top_level) {
            throw ValidationException::withMessages([
                'issue_type_id' => "The \"$type->name\" issue type can only be created as a sub-issue.",
            ]);
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
