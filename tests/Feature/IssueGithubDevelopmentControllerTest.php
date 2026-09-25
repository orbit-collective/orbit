<?php

use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->project = Project::factory()->create();
    $this->issue = Issue::factory()->create(['project_id' => $this->project->id]);
    $this->member = User::factory()->create();
    $this->project->users()->attach($this->member->id, ['role' => 'member']);
});

test('a project member can create a branch for an issue', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    Http::fake(['*/v1/github/branches' => Http::response([
        'success' => true,
        'data' => ['name' => '1234-fix-login', 'url' => 'https://github.com/orbit-collective/orbit/tree/1234-fix-login'],
    ], 201)]);

    $response = $this->actingAs($this->member)->post("/issues/{$this->issue->id}/github/branches", [
        'repository_id' => 1,
        'name' => '1234-fix-login',
    ]);

    $response->assertRedirect();
    Http::assertSent(fn ($request) => str_contains($request->url(), '/v1/github/branches'));
});

test('creating a branch requires a repository_id and a name', function () {
    $response = $this->actingAs($this->member)->post("/issues/{$this->issue->id}/github/branches", []);

    $response->assertSessionHasErrors(['repository_id', 'name']);
});

test('a non-member cannot create a branch', function () {
    $response = $this->actingAs(User::factory()->create())->post("/issues/{$this->issue->id}/github/branches", [
        'repository_id' => 1,
        'name' => '1234-fix-login',
    ]);

    $response->assertForbidden();
});

test('a failed relay call surfaces a validation error instead of a 500', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    Http::fake(['*/v1/github/branches' => Http::response([
        'success' => false,
        'error' => ['code' => 'GITHUB_BRANCH_ALREADY_EXISTS', 'message' => 'A branch with that name already exists.'],
    ], 409)]);

    $response = $this->actingAs($this->member)->post("/issues/{$this->issue->id}/github/branches", [
        'repository_id' => 1,
        'name' => '1234-fix-login',
    ]);

    $response->assertSessionHasErrors(['branch']);
});
