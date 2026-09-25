<?php

use App\Jobs\SyncGithubIntegrationJob;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->project = Project::factory()->create();
    $this->admin = User::factory()->create();
    $this->project->users()->attach($this->admin->id, ['role' => 'admin']);
});

test('an admin can start connecting GitHub', function () {
    Http::fake(['*/v1/github/connections' => Http::response([
        'success' => true,
        'data' => [
            'connection' => ['id' => 'conn_1', 'status' => 'pending', 'installationId' => null, 'repository' => null, 'createdAt' => 'now', 'connectedAt' => null, 'revokedAt' => null],
            'token' => 'orb_local_secret',
            'installUrl' => 'https://github.com/apps/orbit/installations/new?state=xyz',
        ],
    ], 201)]);

    $response = $this->actingAs($this->admin)->post("/projects/{$this->project->id}/integrations/github/connect");

    $response->assertRedirect();
    $this->assertDatabaseHas('project_integrations', [
        'project_id' => $this->project->id,
        'integration' => 'github',
        'github_status' => 'pending',
    ]);
});

test('a member without the integrations.update permission cannot connect GitHub', function () {
    $member = User::factory()->create();
    $this->project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($member)->post("/projects/{$this->project->id}/integrations/github/connect");

    $response->assertForbidden();
});

test('guests cannot connect GitHub', function () {
    $response = $this->post("/projects/{$this->project->id}/integrations/github/connect");

    $response->assertRedirect('/login');
});

test('an admin can disconnect GitHub', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    Http::fake(['*/v1/github/connections/revoke' => Http::response(['success' => true, 'data' => ['revoked' => true]], 200)]);

    $response = $this->actingAs($this->admin)->post("/projects/{$this->project->id}/integrations/github/disconnect");

    $response->assertRedirect();
    $this->assertDatabaseHas('project_integrations', [
        'project_id' => $this->project->id,
        'integration' => 'github',
        'github_status' => 'revoked',
    ]);
});

test('a member without the integrations.update permission cannot disconnect GitHub', function () {
    $member = User::factory()->create();
    $this->project->users()->attach($member->id, ['role' => 'member']);

    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    $response = $this->actingAs($member)->post("/projects/{$this->project->id}/integrations/github/disconnect");

    $response->assertForbidden();
});

test('an admin can retry a degraded sync', function () {
    Bus::fake();

    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
        'github_consecutive_failures' => 2,
        'github_last_error_code' => 'INTERNAL_SERVER_ERROR',
    ]);

    $response = $this->actingAs($this->admin)->post("/projects/{$this->project->id}/integrations/github/retry");

    $response->assertRedirect();
    Bus::assertDispatched(SyncGithubIntegrationJob::class, fn ($job) => $job->projectIntegration->is($projectIntegration));
});

test('a member without the integrations.update permission cannot retry a sync', function () {
    $member = User::factory()->create();
    $this->project->users()->attach($member->id, ['role' => 'member']);

    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    $response = $this->actingAs($member)->post("/projects/{$this->project->id}/integrations/github/retry");

    $response->assertForbidden();
});

test('the settings page never exposes the relay token to the frontend', function () {
    Http::fake(['*/v1/github/connections' => Http::response([
        'success' => true,
        'data' => [
            'connection' => ['id' => 'conn_1', 'status' => 'pending', 'installationId' => null, 'repository' => null, 'createdAt' => 'now', 'connectedAt' => null, 'revokedAt' => null],
            'token' => 'orb_local_super_secret_token',
            'installUrl' => 'https://github.com/apps/orbit/installations/new?state=xyz',
        ],
    ], 201)]);

    $this->actingAs($this->admin)->post("/projects/{$this->project->id}/integrations/github/connect");

    $response = $this->actingAs($this->admin)->get("/settings/integrations?project={$this->project->id}");

    $response->assertOk();
    $response->assertDontSee('orb_local_super_secret_token', false);
});

test('the settings page loads instead of 500ing when the stored relay token cannot be decrypted', function () {
    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
        'github_repository_owner' => 'orbit-collective',
        'github_repository_name' => 'orbit',
    ]);

    DB::table('project_integrations')->where('id', $projectIntegration->id)->update([
        'github_relay_token' => 'not-a-valid-encrypted-payload',
    ]);

    $response = $this->actingAs($this->admin)->get("/settings/integrations?project={$this->project->id}");

    $response->assertOk();
});

test('an admin can add a repository', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    Http::fake(['*/v1/github/repositories' => Http::response([
        'success' => true,
        'data' => ['id' => 2, 'owner' => 'orbit-collective', 'name' => 'orbit-api'],
    ], 201)]);

    $response = $this->actingAs($this->admin)->post("/projects/{$this->project->id}/integrations/github/repositories", [
        'repository_id' => 2,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('github_repositories', ['repository_id' => 2, 'name' => 'orbit-api']);
});

test('a member cannot add a repository', function () {
    $member = User::factory()->create();
    $this->project->users()->attach($member->id, ['role' => 'member']);

    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    Http::fake();

    $response = $this->actingAs($member)->post("/projects/{$this->project->id}/integrations/github/repositories", [
        'repository_id' => 2,
    ]);

    $response->assertForbidden();
    Http::assertNothingSent();
});

test('an admin can remove a repository', function () {
    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);
    app(\App\Repositories\GithubRepositoryRepository::class)
        ->create($projectIntegration, 2, 'orbit-collective', 'orbit-api');

    Http::fake(['*/v1/github/repositories/2' => Http::response([
        'success' => true,
        'data' => ['removed' => true, 'repositoryId' => 2],
    ], 200)]);

    $response = $this->actingAs($this->admin)->delete("/projects/{$this->project->id}/integrations/github/repositories/2");

    $response->assertRedirect();
    $this->assertDatabaseMissing('github_repositories', ['repository_id' => 2]);
});

test('an admin can trigger a repository sync', function () {
    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    Http::fake(['*/v1/github/repositories' => Http::response([
        'success' => true,
        'data' => ['repositories' => [
            ['id' => 1, 'owner' => 'orbit-collective', 'name' => 'orbit'],
        ]],
    ], 200)]);

    $response = $this->actingAs($this->admin)->post("/projects/{$this->project->id}/integrations/github/repositories/sync");

    $response->assertRedirect();
    $this->assertDatabaseHas('github_repositories', ['project_integration_id' => $projectIntegration->id, 'repository_id' => 1]);
});
