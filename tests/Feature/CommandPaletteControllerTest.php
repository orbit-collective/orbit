<?php

use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;

uses(RefreshDatabase::class);

test('guests get 401', function () {
    $this->getJson('/command-palette/search?q=login')->assertUnauthorized();
});

test('a missing, empty or over-long q is a 422', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/command-palette/search')->assertUnprocessable()->assertJsonValidationErrors('q');
    $this->actingAs($user)->getJson('/command-palette/search?q=')->assertUnprocessable();
    $this->actingAs($user)->getJson('/command-palette/search?q='.str_repeat('a', 101))->assertUnprocessable();
});

test('it returns the issues and projects of the user\'s memberships as JSON', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['name' => 'Login Portal']);
    $project->users()->attach($user->id, ['role' => 'member']);
    $issue = Issue::factory()->create(['project_id' => $project->id, 'title' => 'Fix login redirect']);

    $this->actingAs($user)->getJson('/command-palette/search?q=login')
        ->assertOk()
        ->assertJsonPath('issues.0.id', $issue->id)
        ->assertJsonPath('issues.0.title', 'Fix login redirect')
        ->assertJsonPath('issues.0.project.name', 'Login Portal')
        ->assertJsonPath('projects.0.id', $project->id);
});

test('typing #42 returns issue 42 first if the user can see it', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->users()->attach($user->id, ['role' => 'member']);
    Issue::factory()->create(['project_id' => $project->id, 'title' => 'Other', 'number' => 7]);
    $target = Issue::factory()->create(['project_id' => $project->id, 'title' => 'Target', 'number' => 42]);

    $this->actingAs($user)->getJson('/command-palette/search?q='.urlencode('#42'))
        ->assertOk()
        ->assertJsonCount(1, 'issues')
        ->assertJsonPath('issues.0.id', $target->id)
        ->assertJsonPath('issues.0.number', 42);
});

test('a non-member never sees another project\'s issues or projects', function () {
    $outsider = User::factory()->create();
    $project = Project::factory()->create(['name' => 'Private Login']);
    Issue::factory()->create(['project_id' => $project->id, 'title' => 'Login secret', 'number' => 3]);

    $this->actingAs($outsider)->getJson('/command-palette/search?q=login')
        ->assertOk()
        ->assertExactJson(['issues' => [], 'projects' => [], 'people' => []]);
    $this->actingAs($outsider)->getJson('/command-palette/search?q='.urlencode('#3'))
        ->assertOk()
        ->assertJsonPath('issues', []);
});

test('the endpoint is rate limited per user', function () {
    $user = User::factory()->create();
    RateLimiter::clear('command-palette'.$user->id);

    foreach (range(1, 120) as $i) {
        $this->actingAs($user)->getJson('/command-palette/search?q=ab')->assertOk();
    }

    $this->actingAs($user)->getJson('/command-palette/search?q=ab')->assertStatus(429);
});

test('an "@" query returns people who share a project, linked to the filtered issue list', function () {
    $user = User::factory()->create(['name' => 'Zed Viewer']);
    $ann = User::factory()->create(['name' => 'Ann Marlow']);
    $project = Project::factory()->create();
    $project->users()->attach([$user->id => ['role' => 'member'], $ann->id => ['role' => 'member']]);

    $this->actingAs($user)->getJson('/command-palette/search?q='.urlencode('@ann'))
        ->assertOk()
        ->assertJsonCount(0, 'issues')
        ->assertJsonPath('people.0.name', 'Ann Marlow')
        ->assertJsonPath('people.0.url', "/projects/{$project->id}?assignee={$ann->id}");
});

test('an "@" query never exposes people from projects the user is not in', function () {
    $user = User::factory()->create();
    $stranger = User::factory()->create(['name' => 'Ann Hidden']);
    Project::factory()->create()->users()->attach($stranger->id, ['role' => 'member']);

    $this->actingAs($user)->getJson('/command-palette/search?q='.urlencode('@ann'))
        ->assertOk()
        ->assertJsonPath('people', []);
});
