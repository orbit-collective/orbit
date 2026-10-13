<?php

use App\Models\ActivityLog;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('dashboard page is displayed for an authenticated user', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/');

    $response->assertStatus(200);
});

test('guests are redirected to login instead of seeing the dashboard', function () {
    $response = $this->get('/');

    $response->assertRedirect(route('login'));
});

test('the dashboard renders the expected Inertia component and props', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    addProjectMember($project, $user->id, 'admin');
    // Each factory-created issue also creates its own creator/assignee users,
    // so the exact `users` count isn't asserted here — only its shape.
    Issue::factory()->count(3)->create(['project_id' => $project->id]);

    $response = $this->actingAs($user)->get('/');

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Dashboard')
        ->has('issues', 3)
        ->has('projects', 1)
        ->has('productivity_trend')
        ->has('users')
        ->has('users.0.id')
        ->has('users.0.name')
    );
});

test('the dashboard paginates the activity logs with the activity page params', function () {
    $user = User::factory()->create();
    ActivityLog::factory()->count(25)->create(['user_id' => $user->id]);
    ActivityLog::factory()->count(3)->create(); // another user's logs

    $this->actingAs($user)->get('/')->assertInertia(fn (Assert $page) => $page
        ->has('activityLogs.data', 10)
        ->where('activityLogs.total', 25)
        ->where('activityLogs.current_page', 1)
        ->has('activityLogs.data.0', fn (Assert $entry) => $entry
            ->hasAll(['id', 'body', 'userId', 'userName', 'userAvatar', 'createdAt'])
        )
    );

    $this->actingAs($user)->get('/?activityPage=3&activityPerPage=10')->assertInertia(fn (Assert $page) => $page
        ->has('activityLogs.data', 5)
        ->where('activityLogs.current_page', 3)
        ->where('queryParams.activityPage', '3')
        ->where('queryParams.activityPerPage', '10')
    );

    $this->actingAs($user)->get('/?activityPerPage=20')->assertInertia(fn (Assert $page) => $page
        ->has('activityLogs.data', 20)
    );
});
