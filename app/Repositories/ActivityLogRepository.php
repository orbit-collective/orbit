<?php

namespace App\Repositories;

use App\Models\ActivityLog;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class ActivityLogRepository
{
    public const int MAX_PER_PAGE = 100;

    public function getRecentForProject(int $projectId, int $limit = 15): Collection {
        return ActivityLog::query()->where('project_id', $projectId)->with('user')->latest()->limit($limit)->get();
    }

    public function getRecentForUser(int $userId, int $limit = 15): Collection {
        return ActivityLog::query()->where('user_id', $userId)->with('user')->latest()->limit($limit)->get();
    }

    public function paginateForProject(int $projectId, int $perPage, string $pageName = 'page'): LengthAwarePaginator
    {
        return $this->paginate(ActivityLog::query()->where('project_id', $projectId), $perPage, $pageName);
    }

    public function paginateForUser(int $userId, int $perPage, string $pageName = 'page'): LengthAwarePaginator
    {
        return $this->paginate(ActivityLog::query()->where('user_id', $userId), $perPage, $pageName);
    }

    /**
     * Delete the user's own entries logged before $before. Entries other
     * people wrote - even in the same project - are never touched.
     */
    public function deleteOlderThanForUser(int $userId, Carbon $before): int
    {
        return ActivityLog::query()
            ->where('user_id', $userId)
            ->where('created_at', '<', $before)
            ->delete();
    }

    /**
     * Newest first, with the id as a tie-breaker so entries logged within the
     * same second keep a stable order across pages. The page size is clamped
     * so a hand-edited query string can't ask for an unbounded page.
     */
    private function paginate(Builder $query, int $perPage, string $pageName): LengthAwarePaginator
    {
        return $query->with('user')
            ->latest()
            ->latest('id')
            ->paginate(max(1, min($perPage, self::MAX_PER_PAGE)), ['*'], $pageName)
            ->withQueryString();
    }
}
