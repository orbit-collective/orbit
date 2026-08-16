<?php

use App\Models\ActivityLog;
use App\Models\Project;
use App\Models\User;
use App\Repositories\ActivityLogRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = new ActivityLogRepository();
});

test('it can get recent activity logs for a project', function () {
    $project = Project::factory()->create();
    ActivityLog::factory()->count(20)->create(['project_id' => $project->id]);
    ActivityLog::factory()->count(5)->create(); // other project

    $logs = $this->repository->getRecentForProject($project->id, 10);

    expect($logs)->toHaveCount(10);
});

test('it can get recent account-level activity logs for a user', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    ActivityLog::factory()->count(20)->create(['project_id' => null, 'user_id' => $user->id]);
    ActivityLog::factory()->create(['project_id' => null, 'user_id' => $otherUser->id]);
    ActivityLog::factory()->create(['user_id' => $user->id]); // project-scoped, should be excluded

    $logs = $this->repository->getRecentForUser($user->id, 10);

    expect($logs)->toHaveCount(10);
    expect($logs->every(fn ($log) => $log->user_id === $user->id))->toBeTrue();
});
