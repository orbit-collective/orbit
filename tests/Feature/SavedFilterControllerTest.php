<?php

use App\Models\Project;
use App\Models\SavedFilter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a saved filter can be created', function () {
    $project = Project::factory()->create();

    $response = $this->actingAs(User::factory()->create())->post('/saved-filters', [
        'project_id' => $project->id,
        'name' => 'My filter',
        'context' => 'project_issues',
        'query_params' => ['status' => 'open'],
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success', 'Saved filters has been created successfully.');
    $this->assertDatabaseHas('saved_filters', [
        'project_id' => $project->id,
        'name' => 'My filter',
    ]);
});

test('creating a saved filter requires project_id, name, context and query_params', function () {
    $response = $this->actingAs(User::factory()->create())->post('/saved-filters', []);

    $response->assertSessionHasErrors(['project_id', 'name', 'context', 'query_params']);
});

test('creating a saved filter requires the project_id to reference a real project', function () {
    $response = $this->actingAs(User::factory()->create())->post('/saved-filters', [
        'project_id' => 999999,
        'name' => 'My filter',
        'context' => 'project_issues',
        'query_params' => ['status' => 'open'],
    ]);

    $response->assertSessionHasErrors('project_id');
});

test('creating a saved filter enforces a 20 character max length on the name', function () {
    $project = Project::factory()->create();

    $response = $this->actingAs(User::factory()->create())->post('/saved-filters', [
        'project_id' => $project->id,
        'name' => str_repeat('a', 21),
        'context' => 'project_issues',
        'query_params' => ['status' => 'open'],
    ]);

    $response->assertSessionHasErrors('name');
});

test('guests cannot create a saved filter', function () {
    $response = $this->post('/saved-filters', []);

    $response->assertRedirect(route('login'));
});

test('a saved filter can be deleted', function () {
    $filter = SavedFilter::factory()->create(['project_id' => Project::factory()]);

    $response = $this->actingAs(User::factory()->create())->delete("/saved-filters/{$filter->id}");

    $response->assertRedirect();
    $response->assertSessionHas('success', 'Saved filters has been deleted successfully.');
    $this->assertDatabaseMissing('saved_filters', ['id' => $filter->id]);
});

test('deleting a non-existent saved filter returns a 404', function () {
    $response = $this->actingAs(User::factory()->create())->delete('/saved-filters/999999');

    $response->assertStatus(404);
});

test('guests cannot delete a saved filter', function () {
    $filter = SavedFilter::factory()->create(['project_id' => Project::factory()]);

    $response = $this->delete("/saved-filters/{$filter->id}");

    $response->assertRedirect(route('login'));
});
