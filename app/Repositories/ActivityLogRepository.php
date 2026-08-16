<?php

namespace App\Repositories;

use App\Models\ActivityLog;
use Illuminate\Support\Collection;

class ActivityLogRepository
{
    public function getRecentForProject(int $projectId, int $limit = 15): Collection {
        return ActivityLog::query()->where('project_id', $projectId)->with('user')->latest()->limit($limit)->get();
    }

    public function getRecentForUser(int $userId, int $limit = 15): Collection {
        return ActivityLog::query()->whereNull('project_id')->where('user_id', $userId)->latest()->limit($limit)->get();
    }
}
