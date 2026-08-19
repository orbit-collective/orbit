<?php

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
    $project = Project::factory()->create();
    // Each factory-created issue also creates its own creator/assignee users,
    // so the exact `users` count isn't asserted here — only its shape.
    Issue::factory()->count(3)->create(['project_id' => $project->id]);

    $response = $this->actingAs(User::factory()->create())->get('/');

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
