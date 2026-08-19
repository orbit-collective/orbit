<?php

use App\Models\Issue;
use App\Models\Project;
use App\Models\SavedFilter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('the projects index page lists every project with its issues', function () {
    $projectWithIssues = Project::factory()->create(['name' => 'Has issues']);
    Issue::factory()->count(2)->create(['project_id' => $projectWithIssues->id]);
    Project::factory()->create(['name' => 'No issues']);

    $response = $this->actingAs(User::factory()->create())->get('/projects');

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Projects/Index')
        ->has('projects', 2)
    );
});

test('guests cannot view the projects index', function () {
    $response = $this->get('/projects');

    $response->assertRedirect(route('login'));
});

test('a project can be created', function () {
    $response = $this->actingAs(User::factory()->create())->post('/projects', [
        'name' => 'My New Project',
        'description' => 'A description',
        'slug' => 'client-submitted-slug',
        'color' => 'blue',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('projects', ['name' => 'My New Project']);
});

test('creating a project always slugifies the name, ignoring any client-submitted slug', function () {
    $this->actingAs(User::factory()->create())->post('/projects', [
        'name' => 'My New Project',
        'slug' => 'totally-different-slug',
        'color' => 'blue',
    ]);

    $project = Project::where('name', 'My New Project')->firstOrFail();

    expect($project->slug)->toBe('my-new-project');
});

test('creating a project redirects back with a success message and the show-page action url', function () {
    $response = $this->actingAs(User::factory()->create())->post('/projects', [
        'name' => 'Flash Project',
        'slug' => 'flash-project',
        'color' => 'blue',
    ]);

    $project = Project::where('name', 'Flash Project')->firstOrFail();

    $response->assertSessionHas('success', 'Project has been created successfully.');
    $response->assertSessionHas('action_url', route('projects.show', $project->id));
});

test('creating a project requires a name, slug and color', function () {
    $response = $this->actingAs(User::factory()->create())->post('/projects', []);

    $response->assertSessionHasErrors(['name', 'slug', 'color']);
});

test('creating a project enforces a 30 character max length on the name', function () {
    $response = $this->actingAs(User::factory()->create())->post('/projects', [
        'name' => str_repeat('a', 31),
        'slug' => 'slug',
        'color' => 'blue',
    ]);

    $response->assertSessionHasErrors('name');
});

test('guests cannot create a project', function () {
    $response = $this->post('/projects', []);

    $response->assertRedirect(route('login'));
});

test('the project show page returns the expected Inertia props', function () {
    $project = Project::factory()->create();
    Issue::factory()->count(3)->create(['project_id' => $project->id]);
    $filter = SavedFilter::factory()->create(['project_id' => $project->id]);

    $response = $this->actingAs(User::factory()->create())->get("/projects/{$project->id}");

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Projects/Show')
        ->where('project.id', $project->id)
        ->has('issues.data', 3)
        ->where('savedFilters.0.id', $filter->id)
        ->where('queryParams', null)
    );
});

test('the project show page defaults to 10 issues per page', function () {
    $project = Project::factory()->create();
    Issue::factory()->count(12)->create(['project_id' => $project->id]);

    $response = $this->actingAs(User::factory()->create())->get("/projects/{$project->id}");

    $response->assertInertia(fn (Assert $page) => $page
        ->has('issues.data', 10)
    );
});

test('the project show page respects a custom perPage query parameter', function () {
    $project = Project::factory()->create();
    Issue::factory()->count(12)->create(['project_id' => $project->id]);

    $response = $this->actingAs(User::factory()->create())->get("/projects/{$project->id}?perPage=5");

    $response->assertInertia(fn (Assert $page) => $page
        ->has('issues.data', 5)
    );
});

test('the project show page parses comma-separated status, priority and label filters into arrays', function () {
    $project = Project::factory()->create();

    $response = $this->actingAs(User::factory()->create())
        ->get("/projects/{$project->id}?status=open,closed&priority=high&labels=bug,design");

    $response->assertInertia(fn (Assert $page) => $page
        ->where('filters.status', ['open', 'closed'])
        ->where('filters.priority', ['high'])
        ->where('filters.labels', ['bug', 'design'])
    );
});

test('the project show page exposes the raw query params when present', function () {
    $project = Project::factory()->create();

    $response = $this->actingAs(User::factory()->create())
        ->get("/projects/{$project->id}?search=foo");

    $response->assertInertia(fn (Assert $page) => $page
        ->where('queryParams.search', 'foo')
    );
});

test('visiting a non-existent project returns a 404', function () {
    $response = $this->actingAs(User::factory()->create())->get('/projects/999999');

    $response->assertStatus(404);
});

test('guests cannot view a project', function () {
    $project = Project::factory()->create();

    $response = $this->get("/projects/{$project->id}");

    $response->assertRedirect(route('login'));
});

test('a project\'s visible columns can be updated', function () {
    $project = Project::factory()->create(['columns' => ['id' => true, 'title' => true]]);

    $response = $this->actingAs(User::factory()->create())->patch("/projects/{$project->id}/columns", [
        'columns' => ['title' => false, 'status' => true],
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success', 'Columns configuration updated successfully.');

    $fresh = $project->fresh();
    expect($fresh->columns)->toMatchArray(['id' => true, 'title' => false, 'status' => true]);
});

test('updating columns requires the columns field to be an array', function () {
    $project = Project::factory()->create();

    $response = $this->actingAs(User::factory()->create())->patch("/projects/{$project->id}/columns", [
        'columns' => 'not-an-array',
    ]);

    $response->assertSessionHasErrors('columns');
});

test('updating columns rejects non-boolean column values', function () {
    $project = Project::factory()->create();

    $response = $this->actingAs(User::factory()->create())->patch("/projects/{$project->id}/columns", [
        'columns' => ['title' => 'not-a-boolean'],
    ]);

    $response->assertSessionHasErrors('columns.title');
});

test('guests cannot update project columns', function () {
    $project = Project::factory()->create();

    $response = $this->patch("/projects/{$project->id}/columns", ['columns' => []]);

    $response->assertRedirect(route('login'));
});
