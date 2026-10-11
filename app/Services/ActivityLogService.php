<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Repositories\ActivityLogRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class ActivityLogService
{
    /** Query-string names for the activity log pager, kept apart from the issue list's own `page`/`perPage`. */
    public const string PAGE_NAME = 'activityPage';

    public const string PER_PAGE_NAME = 'activityPerPage';

    public function __construct(
        protected ActivityLogRepository $activityLogRepository
    ) {}

    public function log(?int $projectId, string $body, ?int $userId = null): ActivityLog {
        return ActivityLog::query()->create([
            'project_id' => $projectId,
            'user_id' => $userId ?? auth()->id(),
            'body' => $body,
        ]);
    }

    public function getRecentForProject(int $projectId, int $limit): Collection {
        return $this->activityLogRepository->getRecentForProject($projectId, $limit);
    }
    public function getRecentForUser(int $userId, int $limit): Collection {
        return $this->activityLogRepository->getRecentForUser($userId, $limit);
    }

    public function paginateForProject(int $projectId, int $perPage): LengthAwarePaginator
    {
        return $this->activityLogRepository->paginateForProject($projectId, $perPage, self::PAGE_NAME);
    }

    public function paginateForUser(int $userId, int $perPage): LengthAwarePaginator
    {
        return $this->activityLogRepository->paginateForUser($userId, $perPage, self::PAGE_NAME);
    }
}
