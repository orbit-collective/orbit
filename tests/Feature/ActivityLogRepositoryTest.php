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

    expect($logs)->toHaveCount(10)
        ->and($logs->every(fn($log) => $log->user_id === $user->id))->toBeTrue();
});

test('it paginates activity logs for a project, newest first, scoped to that project', function () {
    $project = Project::factory()->create();
    $old = ActivityLog::factory()->create(['project_id' => $project->id, 'created_at' => now()->subDay()]);
    $new = ActivityLog::factory()->create(['project_id' => $project->id, 'created_at' => now()]);
    ActivityLog::factory()->count(3)->create(); // other projects

    $page = $this->repository->paginateForProject($project->id, 1);

    expect($page->total())->toBe(2)
        ->and($page->lastPage())->toBe(2)
        ->and($page->items())->toHaveCount(1)
        ->and($page->items()[0]->id)->toBe($new->id)
        ->and($page->items()[0]->relationLoaded('user'))->toBeTrue()
        ->and($old->id)->not->toBe($new->id);
});

test('it paginates activity logs for a user', function () {
    $user = User::factory()->create();
    ActivityLog::factory()->count(5)->create(['user_id' => $user->id]);
    ActivityLog::factory()->count(2)->create(); // other users

    $page = $this->repository->paginateForUser($user->id, 2);

    expect($page->total())->toBe(5)
        ->and($page->items())->toHaveCount(2)
        ->and(collect($page->items())->every(fn ($log) => $log->user_id === $user->id))->toBeTrue();
});

test('it keeps entries logged in the same second in a stable order across pages', function () {
    $project = Project::factory()->create();
    $createdAt = now()->startOfSecond();
    $logs = ActivityLog::factory()->count(4)->create(['project_id' => $project->id, 'created_at' => $createdAt]);

    $first = $this->repository->paginateForProject($project->id, 2);

    request()->merge(['page' => 2]);
    $second = $this->repository->paginateForProject($project->id, 2);

    $ids = collect($first->items())->merge($second->items())->pluck('id')->all();

    expect($ids)->toBe($logs->pluck('id')->sortDesc()->values()->all());
});

test('it reads the page from a custom page name and clamps the page size', function () {
    $project = Project::factory()->create();
    ActivityLog::factory()->count(3)->create(['project_id' => $project->id]);

    request()->merge(['activityPage' => 2]);
    $page = $this->repository->paginateForProject($project->id, 2, 'activityPage');

    expect($page->currentPage())->toBe(2)
        ->and($page->items())->toHaveCount(1);

    expect($this->repository->paginateForProject($project->id, 0)->perPage())->toBe(1)
        ->and($this->repository->paginateForProject($project->id, 5000)->perPage())->toBe(ActivityLogRepository::MAX_PER_PAGE);
});
