<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Repositories\ActivityLogRepository;
use Illuminate\Support\Collection;

class ActivityLogService
{
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
}
