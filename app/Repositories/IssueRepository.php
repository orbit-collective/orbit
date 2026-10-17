<?php

namespace App\Repositories;

use App\Models\Issue;
use App\Models\Label;
use App\Models\Project;
use App\Models\WorkflowStatus;
use App\Support\Cache\CacheVersion;
use App\Support\LikePattern;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class IssueRepository
{
    public function findWithRelations(int $id): Issue
    {
        return Issue::query()
            ->with([
                'creator', 'assignee', 'project', 'comments.user',
                'issueType.statuses', 'issueType.transitions', 'issueType.allowedChildTypes',
                'issueType.fields' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
                'workflowStatus', 'parent', 'externalLinks', 'labels',
                'children' => fn ($query) => $query->with(['assignee', 'issueType', 'workflowStatus', 'labels']),
            ])
            ->findOrFail($id);
    }

    public function store(array $data): Issue
    {
        return Issue::query()->create($data);
    }

    /** The number the next issue created in the project will get (a hint only). */
    public function peekNextNumber(Project $project): int
    {
        return (int) $project->next_issue_number;
    }

    /** The workflow status with this id, if there is one (an issue may have none). */
    public function findWorkflowStatus(mixed $statusId): ?WorkflowStatus
    {
        return $statusId ? WorkflowStatus::query()->find($statusId) : null;
    }

    /** The project-scoped number of the issue with this internal id, if it exists. */
    public function findNumber(int $issueId): ?int
    {
        $number = Issue::query()->whereKey($issueId)->value('number');

        return $number === null ? null : (int) $number;
    }

    public function findByNumber(int $projectId, int $number): ?Issue
    {
        return Issue::query()->where('project_id', $projectId)->where('number', $number)->first();
    }

    /** Just enough of an issue to render it as a breadcrumb crumb. */
    public function findBasic(int $id): ?Issue
    {
        return Issue::query()->with('issueType')->find($id);
    }

    /**
     * Scoped by project_id at the query level (not "find then compare") so a
     * caller can never accidentally resolve an issue belonging to a
     * different project just by getting the scoping check wrong.
     */
    public function findForProject(int $id, int $projectId): ?Issue
    {
        return Issue::query()->where('project_id', $projectId)->find($id);
    }

    /**
     * Issues of one project whose id starts with the typed digits - backs the
     * "#2" mention suggestions in the comment box. Always scoped by
     * project_id so a mention can never surface another project's issue.
     *
     * @return Collection<array-key, Issue>
     */
    public function searchByIdPrefix(int $projectId, string $idPrefix, int $limit = 5): Collection
    {
        $query = Issue::query();
        // PostgreSQL has no implicit bigint -> text conversion for LIKE, and
        // MySQL and MariaDB have no TEXT target for CAST, so pick the type per driver.
        $textType = in_array($query->getConnection()->getDriverName(), ['mysql', 'mariadb'], true) ? 'CHAR' : 'TEXT';

        return $query
            ->where('project_id', $projectId)
            ->whereRaw("CAST(issues.number AS {$textType}) LIKE ?", [$idPrefix.'%'])
            ->with('assignee')
            ->orderBy('number')
            ->limit($limit)
            ->get();
    }

    /**
     * Issues the user can see (every project they are a member of) for the
     * command palette. Ranked exact "#number" > title prefix > title
     * substring, then most recently updated; `$number` is the project-scoped
     * "#12" the user typed, if any, and `$q` is the free-text title search
     * ("" skips the title match, leaving a pure number lookup).
     *
     * @return Collection<array-key, Issue>
     */
    public function searchForUser(int $userId, string $q, int $limit = 8, ?int $number = null): Collection
    {
        $titleLower = 'LOWER(issues.title)';
        $escape = LikePattern::ESCAPE;
        $hasTitle = $q !== '';

        $query = Issue::query()
            ->whereIn('issues.project_id', fn ($members) => $members
                ->select('project_id')
                ->from('project_user')
                ->where('user_id', $userId))
            ->where(function (Builder $match) use ($q, $number, $hasTitle, $titleLower, $escape) {
                if ($number !== null) {
                    $match->orWhere('issues.number', $number);
                }
                if ($hasTitle) {
                    $match->orWhereRaw("{$titleLower} LIKE ? ESCAPE '{$escape}'", [LikePattern::contains($q)]);
                }
            })
            ->with(['issueType', 'workflowStatus', 'project']);

        $rank = [];
        $bindings = [];
        if ($number !== null) {
            $rank[] = 'WHEN issues.number = ? THEN 0';
            $bindings[] = $number;
        }
        if ($hasTitle) {
            $rank[] = "WHEN {$titleLower} LIKE ? ESCAPE '{$escape}' THEN 1";
            $bindings[] = LikePattern::startsWith($q);
        }

        if ($rank !== []) {
            $query->orderByRaw('CASE '.implode(' ', $rank).' ELSE 2 END', $bindings);
        }

        return $query
            ->orderByDesc('issues.updated_at')
            ->orderByDesc('issues.id')
            ->limit($limit)
            ->get();
    }

    /**
     * Bulk-create primitive: loops the existing store() per row rather than a
     * raw insert(), so Eloquent casts/model events still run per issue (e.g.
     * the labels pivot sync) - correctness over a single fast query.
     *
     * @return Collection<array-key, Issue>
     */
    public function createMany(array $rows): Collection
    {
        return collect($rows)->map(fn (array $row) => $this->store($row));
    }

    public function update(Issue $issue, array $data): Issue
    {
        $issue->update($data);

        return $issue;
    }

    /**
     * Counts of every issue in the user's projects by priority and by workflow
     * status category (an issue without a status counts as to do), from one
     * grouped query - the dashboard only draws totals, so it never needs the
     * issue rows themselves.
     *
     * @return array{total: int, priority: array{high: int, medium: int, low: int}, category: array{todo: int, in_progress: int, done: int}}
     */
    public function statsForUser(int $userId): array
    {
        $stats = [
            'total' => 0,
            'priority' => ['high' => 0, 'medium' => 0, 'low' => 0],
            'category' => ['todo' => 0, 'in_progress' => 0, 'done' => 0],
        ];

        $rows = Issue::query()
            ->leftJoin('workflow_statuses', 'issues.workflow_status_id', '=', 'workflow_statuses.id')
            ->whereIn('issues.project_id', fn ($members) => $members
                ->select('project_id')
                ->from('project_user')
                ->where('user_id', $userId))
            ->selectRaw("issues.priority, COALESCE(workflow_statuses.category, 'todo') as category, COUNT(*) as total")
            ->groupBy('issues.priority', 'category')
            ->toBase()
            ->get();

        foreach ($rows as $row) {
            $stats['total'] += (int) $row->total;

            if (isset($stats['priority'][$row->priority])) {
                $stats['priority'][$row->priority] += (int) $row->total;
            }

            if (isset($stats['category'][$row->category])) {
                $stats['category'][$row->category] += (int) $row->total;
            }
        }

        return $stats;
    }

    /**
     * The project's issues that overlap the date range (they start on or
     * before `$to` and end, or - with no end date - start, on or after
     * `$from`), for the calendar. Respects the same search box and filter
     * chips as the table.
     */
    public function getForProjectInRange(int $projectId, string $from, string $to, array $searchParams = [], array $filters = []): Collection
    {
        $query = Issue::query()
            ->where('issues.project_id', $projectId)
            ->whereNotNull('issues.start_date')
            ->where('issues.start_date', '<=', $to)
            ->whereRaw('COALESCE(issues.end_date, issues.start_date) >= ?', [$from])
            ->with(['assignee', 'issueType', 'workflowStatus', 'labels'])
            ->orderByRaw("CASE WHEN issues.priority = 'high' THEN 1 WHEN issues.priority = 'medium' THEN 2 WHEN issues.priority = 'low' THEN 3 ELSE 4 END")
            ->orderBy('issues.id');

        $this->applySearchAndFilters($query, $searchParams, $filters);

        return $query->get();
    }

    /**
     * The project's unfinished issues that have an end date, soonest first -
     * what the calendar's deadlines panel lists, capped so a project with a
     * long backlog does not ship all of it.
     */
    public function getUpcomingDeadlines(int $projectId, array $searchParams = [], array $filters = [], int $limit = 50): Collection
    {
        $query = Issue::query()
            ->where('issues.project_id', $projectId)
            ->whereNotNull('issues.end_date')
            ->where(fn ($open) => $open
                ->whereNull('issues.workflow_status_id')
                ->orWhereDoesntHave('workflowStatus', fn ($status) => $status->where('category', 'done')))
            ->with(['assignee', 'issueType', 'workflowStatus', 'labels'])
            ->orderBy('issues.end_date')
            ->orderBy('issues.id')
            ->limit($limit);

        $this->applySearchAndFilters($query, $searchParams, $filters);

        return $query->get();
    }

    public function getAllPaginated(string|int $projectID = 'all', int $perPage = 20, array $sortParams = [], array $searchParams = [], array $filters = []): LengthAwarePaginator
    {
        // The board moves an issue by picking a status its type's workflow can
        // reach, so each type comes with its statuses and transitions.
        $query = Issue::query()->with([
            'creator', 'assignee', 'workflowStatus', 'issueType', 'labels',
            'issueType.statuses' => fn ($statuses) => $statuses->orderBy('sort_order'),
            'issueType.transitions',
        ]);

        if ($projectID !== 'all') {
            $query->where('issues.project_id', $projectID);
        }

        $directionInput = $sortParams['direction'] ?? 'AZ';
        $direction = $directionInput === 'ZA' ? 'desc' : 'asc';

        $column = $sortParams['sort'] ?? null;
        $allowedColumns = ['id', 'title', 'status', 'assignee', 'priority', 'labels', 'updated', 'start_date', 'end_date', 'type'];

        if ($column && in_array($column, $allowedColumns)) {
            switch ($column) {
                case 'id':
                    $query->orderBy('issues.number', $direction)->orderBy('issues.id', $direction);
                    break;

                case 'status':
                    $query->leftJoin('workflow_statuses', 'issues.workflow_status_id', '=', 'workflow_statuses.id')
                        ->select('issues.*')
                        ->orderByRaw("CASE workflow_statuses.category WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'done' THEN 3 ELSE 4 END ".($direction === 'desc' ? 'desc' : 'asc'))
                        ->orderBy('workflow_statuses.sort_order', $direction);
                    break;

                case 'title':
                    $query->orderBy($column, $direction);
                    break;

                case 'labels':
                    $query->orderBy(
                        Label::query()
                            ->select('labels.name')
                            ->join('issue_label', 'issue_label.label_id', '=', 'labels.id')
                            ->whereColumn('issue_label.issue_id', 'issues.id')
                            ->orderBy('labels.name')
                            ->limit(1),
                        $direction,
                    );
                    break;

                case 'priority':
                    if ($direction === 'asc') {
                        $query->orderByRaw("CASE WHEN priority = 'high' THEN 1 WHEN priority = 'medium' THEN 2 WHEN priority = 'low' THEN 3 ELSE 4 END");
                    } else {
                        $query->orderByRaw("CASE WHEN priority = 'high' THEN 4 WHEN priority = 'medium' THEN 3 WHEN priority = 'low' THEN 2 ELSE 1 END");
                    }
                    break;

                case 'assignee':
                    $query->leftJoin('users', 'issues.assignee_id', '=', 'users.id')
                        ->select('issues.*')
                        ->orderBy('users.name', $direction);
                    break;

                case 'type':
                    $query->leftJoin('issue_types', 'issues.issue_type_id', '=', 'issue_types.id')
                        ->select('issues.*')
                        ->orderBy('issue_types.name', $direction);
                    break;

                case 'updated':
                    $query->orderBy('updated_at', $direction);
                    break;
                case 'start_date':
                    $query->orderBy('start_date', $direction);
                    break;
                case 'end_date':
                    $query->orderBy('end_date', $direction);
                    break;
            }
        } else {
            $query->latest();
        }

        $this->applySearchAndFilters($query, $searchParams, $filters);

        return $query->paginate($perPage)->withQueryString();
    }

    /**
     * Applies the search box and filter-chip conditions (search, status,
     * priority, labels, assignee) shared by every unfiltered/filtered issue
     * listing query, in place on the given query builder.
     */
    private function applySearchAndFilters(Builder $query, array $searchParams, array $filters): void
    {
        if ($searchParams) {
            $query->where(function ($q) use ($searchParams) {
                foreach ($searchParams as $key => $value) {
                    if ($key === 'search') {
                        $q->where(function ($sq) use ($value) {
                            $sq->where('title', 'like', "%$value%")
                                ->orWhere('description', 'like', "%$value%")
                                ->orWhere('issues.number', 'like', "%$value%")
                                ->orWhereHas('labels', fn ($label) => $label->where('labels.name', 'like', "%$value%"));
                        });
                    } elseif ($key === 'status') {
                        $q->whereHas('workflowStatus', fn ($status) => $status
                            ->where('name', 'like', "%$value%")
                            ->orWhere('category', 'like', '%'.str_replace(' ', '_', strtolower((string) $value)).'%'));
                    } elseif ($key === 'labels') {
                        $q->whereHas('labels', fn ($label) => $label->where('labels.name', 'like', "%$value%"));
                    } elseif (in_array($key, ['title', 'priority'])) {
                        $q->where($key, 'like', "%$value%");
                    }
                }
            });
        }

        if (! empty($filters)) {
            if (! empty($filters['status'])) {
                $values = is_array($filters['status']) ? $filters['status'] : explode(',', $filters['status']);
                $categories = array_values(array_unique(array_filter(array_map('trim', $values))));

                if ($categories !== []) {
                    $query->whereHas('workflowStatus', fn ($status) => $status->whereIn('category', $categories));
                }
            }
            if (! empty($filters['workflow_status'])) {
                $ids = is_array($filters['workflow_status']) ? $filters['workflow_status'] : explode(',', $filters['workflow_status']);
                $ids = array_values(array_filter(array_map('intval', $ids)));

                if ($ids !== []) {
                    $query->whereIn('issues.workflow_status_id', $ids);
                }
            }
            if (! empty($filters['priority'])) {
                $values = is_array($filters['priority']) ? $filters['priority'] : explode(',', $filters['priority']);
                $query->whereIn('priority', array_filter($values));
            }
            if (! empty($filters['labels'])) {
                $values = is_array($filters['labels']) ? $filters['labels'] : explode(',', $filters['labels']);
                $labelIds = array_values(array_filter(array_map('intval', $values)));

                if ($labelIds !== []) {
                    $query->whereHas('labels', fn ($label) => $label->whereIn('labels.id', $labelIds));
                }
            }
            if (! empty($filters['assignee'])) {
                $assigneeParam = is_array($filters['assignee'])
                    ? implode(',', $filters['assignee'])
                    : $filters['assignee'];

                $values = explode(',', $assigneeParam)
                        |> (fn ($x) => array_map('trim', $x))
                        |> (fn ($x) => array_filter($x, fn ($value) => $value !== ''));

                $includeUnassigned = collect($values)->contains(fn ($value) => in_array(strtolower($value), ['unassigned', 'null', 'none']));
                $assigneeIds = array_values(array_filter($values, 'is_numeric'));

                if ($includeUnassigned || ! empty($assigneeIds)) {
                    $query->where(function ($q) use ($assigneeIds, $includeUnassigned) {
                        if (! empty($assigneeIds)) {
                            $q->orWhereIn('assignee_id', $assigneeIds);
                        }
                        if ($includeUnassigned) {
                            $q->orWhereNull('assignee_id');
                        }
                    });
                }
            }
        }
    }

    public function getProductivityTrendForUser(int $userId): array
    {
        $startOfWeek = Carbon::now()->startOfWeek();
        $endOfWeek = Carbon::now()->endOfWeek();

        $issues = Issue::query()
            ->whereHas('project.users', fn ($query) => $query->where('users.id', $userId))
            ->whereBetween('updated_at', [$startOfWeek, $endOfWeek])
            ->select('updated_at')
            ->get();

        $rawStats = $issues->groupBy(function ($issue) {
            return $issue->updated_at->format('l');
        })->map(fn ($group) => $group->count())->toArray();

        $chartDays = [
            'Monday' => 'Mon', 'Tuesday' => 'Tue', 'Wednesday' => 'Wed',
            'Thursday' => 'Thu', 'Friday' => 'Fri', 'Saturday' => 'Sat', 'Sunday' => 'Sun',
        ];

        $formattedData = [];
        foreach ($chartDays as $fullDay => $shortDay) {
            $formattedData[] = [
                'day' => $shortDay,
                'count' => $rawStats[$fullDay] ?? 0,
            ];
        }

        return $formattedData;
    }

    public function delete(Issue $issue): void
    {
        $issue->delete();
    }

    public function bulkDelete(array $ids): void
    {
        Issue::whereIn('id', $ids)->delete();

        // A query-builder delete fires no model events.
        CacheVersion::bump(CacheVersion::ISSUES);
    }

    public function getMany(array $ids): Collection
    {
        return Issue::query()->whereIn('id', $ids)->get(['id', 'number', 'project_id', 'title']);
    }
}
