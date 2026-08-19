<?php

namespace App\Repositories;

use App\Models\Issue;
use Carbon\Carbon;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class IssueRepository
{
    public function getForProject(int $projectId): Collection {
        return Issue::query()
            ->where('project_id', $projectId)
            ->with(['creator', 'assignee'])
            ->orderByRaw("CASE WHEN priority = 'high' THEN 1 WHEN priority = 'medium' THEN 2 WHEN priority = 'low' THEN 3 ELSE 4 END")
            ->get();
    }
    public function findWithRelations(int $id): Issue {
        return Issue::query()
            ->with(['creator', 'assignee', 'project', 'comments.user'])
            ->findOrFail($id);
    }
    public function store(array $data): Issue {
        return Issue::query()->create($data);
    }
    public function update(Issue $issue, array $data): Issue {
        $issue->update($data);
        return $issue;
    }
    public function getAll(): Collection {
        return Issue::query()->with(['creator', 'assignee'])->latest()->get();
    }
    public function getAllPaginated(string | int $projectID = 'all', int $perPage = 20, array $sortParams = [], array $searchParams = [], array $filters = []): LengthAwarePaginator {
        $query = Issue::query()->with(['creator', 'assignee']);

        if ($projectID !== 'all') {
            $query->where('project_id', $projectID);
        }

        $directionInput = $sortParams['direction'] ?? 'AZ';
        $direction = $directionInput === 'ZA' ? 'desc' : 'asc';

        $column = $sortParams['sort'] ?? null;
        $allowedColumns = ['id', 'title', 'status', 'assignee', 'priority', 'labels', 'updated', 'start_date', 'end_date'];

        if ($column && in_array($column, $allowedColumns)) {
            switch ($column) {
                case 'id':
                case 'title':
                case 'status':
                case 'labels':
                    $query->orderBy($column, $direction);
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

        if ($searchParams) {
            $query->where(function ($q) use ($searchParams) {
                foreach ($searchParams as $key => $value) {
                    if ($key === 'search') {
                        $q->where(function ($sq) use ($value) {
                            $sq->where('title', 'like', "%$value%")
                                ->orWhere('description', 'like', "%$value%")
                                ->orWhere('issues.id', 'like', "%$value%")
                                ->orWhere('labels', 'like', "%$value%");
                        });
                    } elseif (in_array($key, ['title', 'status', 'priority', 'labels'])) {
                        $q->where($key, 'like', "%$value%");
                    }
                }
            });
        }

        if (!empty($filters)) {
            foreach (['status', 'priority'] as $field) {
                if (!empty($filters[$field])) {
                    $values = is_array($filters[$field]) ? $filters[$field] : explode(',', $filters[$field]);
                    $query->whereIn($field, array_filter($values));
                }
            }
            if (!empty($filters['labels'])) {
                $labels = is_array($filters['labels']) ? $filters['labels'] : explode(',', $filters['labels']);
                $labels = array_filter($labels);

                if (!empty($labels)) {
                    $query->where(function ($q) use ($labels) {
                        foreach ($labels as $label) {
                            $q->orWhere('labels', 'like', '%' . trim($label) . '%');
                        }
                    });
                }
            }
            if (!empty($filters['assignee'])) {
                $assigneeParam = is_array($filters['assignee'])
                    ? implode(',', $filters['assignee'])
                    : $filters['assignee'];

                $values = array_filter(array_map('trim', explode(',', $assigneeParam)), fn ($value) => $value !== '');

                $includeUnassigned = collect($values)->contains(fn ($value) => in_array(strtolower($value), ['unassigned', 'null', 'none']));
                $assigneeIds = array_values(array_filter($values, 'is_numeric'));

                if ($includeUnassigned || !empty($assigneeIds)) {
                    $query->where(function ($q) use ($assigneeIds, $includeUnassigned) {
                        if (!empty($assigneeIds)) {
                            $q->orWhereIn('assignee_id', $assigneeIds);
                        }
                        if ($includeUnassigned) {
                            $q->orWhereNull('assignee_id');
                        }
                    });
                }
            }
        }

        return $query->paginate($perPage)->withQueryString();
    }
    public function getProductivityTrend(): array
    {
        $startOfWeek = Carbon::now()->startOfWeek();
        $endOfWeek = Carbon::now()->endOfWeek();

        $issues = Issue::query()
            ->whereBetween('updated_at', [$startOfWeek, $endOfWeek])
            ->select('updated_at')
            ->get();

        $rawStats = $issues->groupBy(function ($issue) {
            return $issue->updated_at->format('l');
        })->map(fn($group) => $group->count())->toArray();

        $chartDays = [
            'Monday' => 'Mon', 'Tuesday' => 'Tue', 'Wednesday' => 'Wed',
            'Thursday' => 'Thu', 'Friday' => 'Fri', 'Saturday' => 'Sat', 'Sunday' => 'Sun'
        ];

        $formattedData = [];
        foreach ($chartDays as $fullDay => $shortDay) {
            $formattedData[] = [
                'day' => $shortDay,
                'count' => $rawStats[$fullDay] ?? 0
            ];
        }

        return $formattedData;
    }
    public function delete(Issue $issue): void {
        $issue->delete();
    }
    public function bulkDelete(array $ids): void {
        Issue::whereIn('id', $ids)->delete();
    }
    public function getMany(array $ids): Collection {
        return Issue::query()->whereIn('id', $ids)->get(['id', 'project_id', 'title']);
    }
}
