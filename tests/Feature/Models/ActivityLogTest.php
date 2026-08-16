<?php

use App\Models\ActivityLog;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a factory-created activity log persists with the expected attributes', function () {
    $log = ActivityLog::factory()->create();

    expect($log->exists)->toBeTrue();
    expect($log->body)->toBeString();
});

test('mass assignment via fillable creates an activity log', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();

    $log = ActivityLog::create([
        'project_id' => $project->id,
        'user_id' => $user->id,
        'body' => 'Did something',
    ]);

    $this->assertDatabaseHas('activity_logs', [
        'id' => $log->id,
        'project_id' => $project->id,
        'user_id' => $user->id,
        'body' => 'Did something',
    ]);
});

test('user() belongs to the user referenced by user_id', function () {
    $user = User::factory()->create();
    $log = ActivityLog::factory()->create(['user_id' => $user->id]);

    expect($log->user())->toBeInstanceOf(BelongsTo::class);
    expect($log->user->id)->toBe($user->id);
});

test('deleting the project cascades to delete its activity logs', function () {
    $project = Project::factory()->create();
    $log = ActivityLog::factory()->create(['project_id' => $project->id]);

    $project->delete();

    $this->assertDatabaseMissing('activity_logs', ['id' => $log->id]);
});

test('deleting the user cascades to delete their activity logs', function () {
    $user = User::factory()->create();
    $log = ActivityLog::factory()->create(['user_id' => $user->id]);

    $user->delete();

    $this->assertDatabaseMissing('activity_logs', ['id' => $log->id]);
});

test('an activity log can be created without a project for account-level activity', function () {
    $user = User::factory()->create();

    $log = ActivityLog::create([
        'project_id' => null,
        'user_id' => $user->id,
        'body' => 'Changed account password',
    ]);

    expect($log->project_id)->toBeNull();
    $this->assertDatabaseHas('activity_logs', [
        'id' => $log->id,
        'project_id' => null,
        'user_id' => $user->id,
    ]);
});
