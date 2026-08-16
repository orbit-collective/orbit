<?php

namespace App\Services;

use App\Models\ActivityLog;

class ActivityLogService
{
    public function log(?int $projectId, string $body, ?int $userId = null): ActivityLog {
        return ActivityLog::query()->create([
            'project_id' => $projectId,
            'user_id' => $userId ?? auth()->id(),
            'body' => $body,
        ]);
    }
}
