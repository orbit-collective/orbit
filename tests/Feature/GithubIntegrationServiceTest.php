<?php

use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Services\Integrations\Github\GithubIntegrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = app(GithubIntegrationService::class);
    $this->project = Project::factory()->create();
});

test('connect creates a pending integration with the relay token and install url stored', function () {
    Http::fake(['*/v1/github/connections' => Http::response([
        'success' => true,
        'data' => [
            'connection' => ['id' => 'conn_1', 'status' => 'pending', 'installationId' => null, 'repository' => null, 'createdAt' => 'now', 'connectedAt' => null, 'revokedAt' => null],
            'token' => 'orb_local_secret',
            'installUrl' => 'https://github.com/apps/orbit/installations/new?state=xyz',
        ],
    ], 201)]);

    $projectIntegration = $this->service->connect($this->project);

    expect($projectIntegration->github_status)->toBe('pending')
        ->and($projectIntegration->github_relay_token)->toBe('orb_local_secret')
        ->and($projectIntegration->github_install_url)->toContain('installations/new');

    $this->assertDatabaseHas('activity_logs', [
        'project_id' => $this->project->id,
        'body' => 'Started connecting the "github" integration',
    ]);
});

test('getConnectStatus reports not_connected when no integration exists', function () {
    expect($this->service->getConnectStatus($this->project))->toBe([
        'status' => 'not_connected', 'installUrl' => null, 'repository' => null, 'connectedAt' => null,
    ]);
});

test('getConnectStatus syncs a pending connection to connected and clears the install url', function () {
    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_connection_id' => 'conn_1',
        'github_relay_token' => 'orb_local_secret',
        'github_install_url' => 'https://github.com/apps/orbit/installations/new?state=xyz',
        'github_status' => 'pending',
    ]);

    Http::fake(['*/v1/github/connections/me' => Http::response([
        'success' => true,
        'data' => ['id' => 'conn_1', 'status' => 'connected', 'installationId' => 163077216, 'repository' => ['id' => 1274545725, 'owner' => 'orbit-collective', 'name' => 'orbit'], 'createdAt' => 'now', 'connectedAt' => '2026-09-20T00:00:00Z', 'revokedAt' => null],
    ], 200)]);

    $status = $this->service->getConnectStatus($this->project);

    expect($status['status'])->toBe('connected')
        ->and($status['installUrl'])->toBeNull()
        ->and($status['repository'])->toBe(['owner' => 'orbit-collective', 'name' => 'orbit']);

    $projectIntegration->refresh();
    expect($projectIntegration->github_installation_id)->toBe(163077216)
        ->and($projectIntegration->github_install_url)->toBeNull();
});

test('getConnectStatus leaves a pending connection untouched when orbit-api is unreachable', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'pending',
    ]);

    Http::fake(['*/v1/github/connections/me' => Http::response(['success' => false, 'error' => ['code' => 'INTERNAL_SERVER_ERROR', 'message' => 'boom']], 500)]);

    $status = $this->service->getConnectStatus($this->project);

    expect($status['status'])->toBe('pending');
});

test('disconnect revokes the relay connection and marks the integration revoked', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    Http::fake(['*/v1/github/connections/revoke' => Http::response(['success' => true, 'data' => ['revoked' => true]], 200)]);

    $this->service->disconnect($this->project);

    $projectIntegration = ProjectIntegration::query()->where('project_id', $this->project->id)->first();
    expect($projectIntegration->github_status)->toBe('revoked')
        ->and($projectIntegration->github_revoked_at)->not->toBeNull();
});

test('disconnect still marks the integration revoked locally even if orbit-api is unreachable', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    Http::fake(['*/v1/github/connections/revoke' => Http::response(['success' => false, 'error' => ['code' => 'INTERNAL_SERVER_ERROR', 'message' => 'boom']], 500)]);

    $this->service->disconnect($this->project);

    $projectIntegration = ProjectIntegration::query()->where('project_id', $this->project->id)->first();
    expect($projectIntegration->github_status)->toBe('revoked');
});

test('rotateToken replaces the stored token without ever persisting both', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_old',
        'github_status' => 'connected',
    ]);

    Http::fake(['*/v1/github/connections/token/rotate' => Http::response(['success' => true, 'data' => ['token' => 'orb_local_new']], 200)]);

    $this->service->rotateToken($this->project);

    $projectIntegration = ProjectIntegration::query()->where('project_id', $this->project->id)->first();
    expect($projectIntegration->github_relay_token)->toBe('orb_local_new');
});

test('rotateToken throws when nothing is connected', function () {
    $this->service->rotateToken($this->project);
})->throws(ValidationException::class);
