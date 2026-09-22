<?php

use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Services\Integrations\Github\GithubIntegrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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

test('connect (reconnect) clears any leftover failure state from a previous connection', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_old',
        'github_status' => 'error',
        'github_consecutive_failures' => 4,
        'github_last_error_code' => 'INVALID_RELAY_TOKEN',
        'github_last_error_message' => 'Orbit no longer has access to this GitHub connection.',
        'github_last_failed_sync_at' => now(),
    ]);

    Http::fake(['*/v1/github/connections' => Http::response([
        'success' => true,
        'data' => [
            'connection' => ['id' => 'conn_2', 'status' => 'pending', 'installationId' => null, 'repository' => null, 'createdAt' => 'now', 'connectedAt' => null, 'revokedAt' => null],
            'token' => 'orb_local_new',
            'installUrl' => 'https://github.com/apps/orbit/installations/new?state=abc',
        ],
    ], 201)]);

    $projectIntegration = $this->service->connect($this->project);

    expect($projectIntegration->github_consecutive_failures)->toBe(0)
        ->and($projectIntegration->github_last_error_code)->toBeNull()
        ->and($projectIntegration->github_last_error_message)->toBeNull()
        ->and($projectIntegration->github_last_failed_sync_at)->toBeNull();
});

test('getConnectStatus reports not_connected when no integration exists', function () {
    expect($this->service->getConnectStatus($this->project))->toBe([
        'status' => 'not_connected', 'installUrl' => null, 'repository' => null, 'connectedAt' => null,
        'health' => null, 'lastSuccessfulSyncAt' => null, 'lastSyncAttemptAt' => null, 'lastFailedSyncAt' => null,
        'errorMessage' => null, 'pendingEventCount' => null, 'pendingEventCountCapped' => false,
    ]);
});

test('getConnectStatus reports the derived health and reliability metadata', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
        'github_consecutive_failures' => 2,
        'github_last_error_code' => 'INTERNAL_SERVER_ERROR',
        'github_last_error_message' => 'The GitHub integration encountered a temporary synchronization error.',
        'github_pending_event_count' => 50,
    ]);

    $status = $this->service->getConnectStatus($this->project);

    expect($status['health'])->toBe('degraded')
        ->and($status['errorMessage'])->toBe('The GitHub integration encountered a temporary synchronization error.')
        ->and($status['pendingEventCount'])->toBe(50)
        ->and($status['pendingEventCountCapped'])->toBeTrue();
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

test('retrySync delegates to the shared synchronizer', function () {
    ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
        'github_consecutive_failures' => 3,
        'github_last_error_code' => 'INTERNAL_SERVER_ERROR',
    ]);

    Http::fake(['*/v1/github/events' => Http::response(['success' => true, 'data' => ['events' => []]], 200)]);

    $this->service->retrySync($this->project);

    $projectIntegration = ProjectIntegration::query()->where('project_id', $this->project->id)->first();
    expect($projectIntegration->github_consecutive_failures)->toBe(0)
        ->and($projectIntegration->github_last_error_code)->toBeNull();
});

test('retrySync is a no-op when nothing is connected', function () {
    $this->service->retrySync($this->project);

    expect(ProjectIntegration::query()->where('project_id', $this->project->id)->count())->toBe(0);
});

test('getConnectStatus never throws for a corrupted relay token and reports error health', function () {
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

    $status = $this->service->getConnectStatus($this->project);

    expect($status['health'])->toBe('error')
        ->and($status['errorMessage'])->toBe('Orbit could not read its stored GitHub connection details. Reconnect to restore access.')
        ->and($status['status'])->toBe('connected')
        ->and($status['repository'])->toBe(['owner' => 'orbit-collective', 'name' => 'orbit']);

    $projectIntegration->refresh();
    expect($projectIntegration->github_last_error_code)->toBe('LOCAL_TOKEN_UNREADABLE');
});

test('disconnect never throws for a corrupted relay token and still marks it revoked', function () {
    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    DB::table('project_integrations')->where('id', $projectIntegration->id)->update([
        'github_relay_token' => 'not-a-valid-encrypted-payload',
    ]);

    $this->service->disconnect($this->project);

    $projectIntegration->refresh();
    expect($projectIntegration->github_status)->toBe('revoked');
});

test('rotateToken throws a validation exception (not a decrypt exception) for a corrupted relay token', function () {
    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    DB::table('project_integrations')->where('id', $projectIntegration->id)->update([
        'github_relay_token' => 'not-a-valid-encrypted-payload',
    ]);

    expect(fn () => $this->service->rotateToken($this->project))->toThrow(ValidationException::class);
});
