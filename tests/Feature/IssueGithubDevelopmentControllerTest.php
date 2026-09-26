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

test('a project member can create a pull request for an issue', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    Http::fake(['*/v1/github/pull-requests' => Http::response([
        'success' => true,
        'data' => ['number' => 51, 'url' => 'https://github.com/orbit-collective/orbit/pull/51', 'title' => 'Fix login'],
    ], 201)]);

    $response = $this->actingAs($this->member)->post("/issues/{$this->issue->id}/github/pull-requests", [
        'repository_id' => 1,
        'title' => 'Fix login',
        'head' => 'fix/login',
        'base' => 'main',
    ]);

    $response->assertRedirect();
    Http::assertSent(function ($request) {
        return str_contains($request->url(), '/v1/github/pull-requests')
            && str_contains($request['body'], "<!-- orbit-issue:{$this->issue->id} -->");
    });
});

test('creating a pull request requires a title, head, and base', function () {
    $response = $this->actingAs($this->member)->post("/issues/{$this->issue->id}/github/pull-requests", [
        'repository_id' => 1,
    ]);

    $response->assertSessionHasErrors(['title', 'head', 'base']);
});

test('a non-member cannot create a pull request', function () {
    $response = $this->actingAs(User::factory()->create())->post("/issues/{$this->issue->id}/github/pull-requests", [
        'repository_id' => 1,
        'title' => 'Fix login',
        'head' => 'fix/login',
        'base' => 'main',
    ]);

    $response->assertForbidden();
});

test('a viewer cannot create a branch', function () {
    $viewer = User::factory()->create();
    $this->project->users()->attach($viewer->id, ['role' => 'viewer']);

    $response = $this->actingAs($viewer)->post("/issues/{$this->issue->id}/github/branches", [
        'repository_id' => 1,
        'name' => '1234-fix-login',
    ]);

    $response->assertForbidden();
});

test('a viewer cannot create a pull request', function () {
    $viewer = User::factory()->create();
    $this->project->users()->attach($viewer->id, ['role' => 'viewer']);

    $response = $this->actingAs($viewer)->post("/issues/{$this->issue->id}/github/pull-requests", [
        'repository_id' => 1,
        'title' => 'Fix login',
        'head' => 'fix/login',
        'base' => 'main',
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

test('a repository not connected to this project is rejected without ever reaching GitHub, for branch creation', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    // Simulates orbit-api's own authorization rejecting a repository id
    // that belongs to another connection entirely - the frontend can send
    // any integer here, but only orbit-api's RepositoryService actually
    // decides what this connection's token is allowed to touch.
    Http::fake(['*/v1/github/branches' => Http::response([
        'success' => false,
        'error' => ['code' => 'GITHUB_REPOSITORY_NOT_ALLOWED', 'message' => 'This repository is not connected to this project.'],
    ], 403)]);

    $response = $this->actingAs($this->member)->post("/issues/{$this->issue->id}/github/branches", [
        'repository_id' => 999999,
        'name' => '1234-fix-login',
    ]);

    $response->assertSessionHasErrors(['branch']);
    expect(session('errors')->get('branch')[0])->toBe('That repository is not connected to this project.');
});

test('a repository not connected to this project is rejected without ever reaching GitHub, for pull request creation', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    Http::fake(['*/v1/github/pull-requests' => Http::response([
        'success' => false,
        'error' => ['code' => 'GITHUB_REPOSITORY_NOT_ALLOWED', 'message' => 'This repository is not connected to this project.'],
    ], 403)]);

    $response = $this->actingAs($this->member)->post("/issues/{$this->issue->id}/github/pull-requests", [
        'repository_id' => 999999,
        'title' => 'Fix login',
        'head' => 'fix/login',
        'base' => 'main',
    ]);

    $response->assertSessionHasErrors(['pullRequest']);
    expect(session('errors')->get('pullRequest')[0])->toBe('That repository is not connected to this project.');
});
