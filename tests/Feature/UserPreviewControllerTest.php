<?php

use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guests get 401', function () {
    $user = User::factory()->create();

    $this->get(route('users.preview', $user))->assertRedirect();
});

test('it returns the profile and recently edited issues of a teammate', function () {
    $viewer = User::factory()->create();
    $teammate = User::factory()->create(['name' => 'Jane Doe', 'email' => 'jane@example.com']);
    $project = Project::factory()->create();
    addProjectMember($project, $viewer->id, 'member');
    addProjectMember($project, $teammate->id, 'member');

    $older = Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $teammate->id, 'updated_at' => now()->subDay()]);
    $newer = Issue::factory()->create(['project_id' => $project->id, 'user_id' => $teammate->id, 'updated_at' => now()]);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $viewer->id]);

    $this->actingAs($viewer)->getJson(route('users.preview', $teammate))
        ->assertOk()
        ->assertJsonPath('name', 'Jane Doe')
        ->assertJsonPath('email', 'jane@example.com')
        ->assertJsonCount(2, 'recentIssues')
        ->assertJsonPath('recentIssues.0.id', $newer->id)
        ->assertJsonPath('recentIssues.1.id', $older->id);
});

test('issues in projects the viewer is not a member of are not listed', function () {
    $viewer = User::factory()->create();
    $teammate = User::factory()->create();
    $shared = Project::factory()->create();
    $hidden = Project::factory()->create();
    addProjectMember($shared, $viewer->id, 'member');
    addProjectMember($shared, $teammate->id, 'member');
    addProjectMember($hidden, $teammate->id, 'member');
    Issue::factory()->create(['project_id' => $hidden->id, 'assignee_id' => $teammate->id]);

    $this->actingAs($viewer)->getJson(route('users.preview', $teammate))
        ->assertOk()
        ->assertJsonCount(0, 'recentIssues');
});

test('a user sharing no project with the viewer is a 404', function () {
    $viewer = User::factory()->create();
    $stranger = User::factory()->create();

    $this->actingAs($viewer)->getJson(route('users.preview', $stranger))->assertNotFound();
});

test('a user can preview themselves', function () {
    $viewer = User::factory()->create();

    $this->actingAs($viewer)->getJson(route('users.preview', $viewer))->assertOk()->assertJsonPath('id', $viewer->id);
});
