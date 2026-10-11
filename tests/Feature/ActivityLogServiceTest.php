<?php

use App\Models\ActivityLog;
use App\Models\Project;
use App\Models\User;
use App\Repositories\ActivityLogRepository;
use App\Services\ActivityLogService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = new ActivityLogService(new ActivityLogRepository());
});

test('it can log activity', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();
    $this->actingAs($user);

    $log = $this->service->log($project->id, 'Test body');

    expect($log->project_id)->toBe($project->id)
        ->and($log->user_id)->toBe($user->id)
        ->and($log->body)->toBe('Test body');
    $this->assertDatabaseHas('activity_logs', [
        'project_id' => $project->id,
        'user_id' => $user->id,
        'body' => 'Test body',
    ]);
});

test('it can log activity with specific user id', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();

    $log = $this->service->log($project->id, 'Test body', $user->id);

    expect($log->user_id)->toBe($user->id);
    $this->assertDatabaseHas('activity_logs', [
        'project_id' => $project->id,
        'user_id' => $user->id,
        'body' => 'Test body',
    ]);
});

test('it can log activity without user if not authenticated', function () {
    $project = Project::factory()->create();

    $log = $this->service->log($project->id, 'System action');

    expect($log->user_id)->toBeNull();
    $this->assertDatabaseHas('activity_logs', [
        'project_id' => $project->id,
        'user_id' => null,
        'body' => 'System action',
    ]);
});

test('it can log account-level activity without a project', function () {
    $user = User::factory()->create();

    $log = $this->service->log(null, 'Changed account password', $user->id);

    expect($log->project_id)->toBeNull()
        ->and($log->user_id)->toBe($user->id);
    $this->assertDatabaseHas('activity_logs', [
        'project_id' => null,
        'user_id' => $user->id,
        'body' => 'Changed account password',
    ]);
});

test('it paginates project and user logs using the activity page name', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();
    ActivityLog::factory()->count(3)->create(['project_id' => $project->id, 'user_id' => $user->id]);

    request()->merge([ActivityLogService::PAGE_NAME => 2]);

    $projectPage = $this->service->paginateForProject($project->id, 2);
    $userPage = $this->service->paginateForUser($user->id, 2);

    expect($projectPage->currentPage())->toBe(2)
        ->and($projectPage->items())->toHaveCount(1)
        ->and($userPage->currentPage())->toBe(2)
        ->and($userPage->items())->toHaveCount(1);
});

test('it returns a limited list of recent logs for a project and a user', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();
    ActivityLog::factory()->count(4)->create(['project_id' => $project->id, 'user_id' => $user->id]);
    ActivityLog::factory()->count(2)->create(); // unrelated

    expect($this->service->getRecentForProject($project->id, 3))->toHaveCount(3)
        ->and($this->service->getRecentForUser($user->id, 3))->toHaveCount(3);
});
