<?php

use App\Models\Project;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = new ActivityLogService();
});

test('it can log activity', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();
    $this->actingAs($user);

    $log = $this->service->log($project->id, 'Test body');

    expect($log->project_id)->toBe($project->id);
    expect($log->user_id)->toBe($user->id);
    expect($log->body)->toBe('Test body');
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

    expect($log->project_id)->toBeNull();
    expect($log->user_id)->toBe($user->id);
    $this->assertDatabaseHas('activity_logs', [
        'project_id' => null,
        'user_id' => $user->id,
        'body' => 'Changed account password',
    ]);
});