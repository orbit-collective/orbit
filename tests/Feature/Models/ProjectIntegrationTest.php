<?php

use App\Models\Project;
use App\Models\ProjectIntegration;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('github_relay_token is encrypted at rest', function () {
    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => Project::factory()->create()->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    $rawValue = DB::table('project_integrations')->where('id', $projectIntegration->id)->value('github_relay_token');

    expect($rawValue)->not->toBe('orb_local_secret')
        ->and($projectIntegration->fresh()->github_relay_token)->toBe('orb_local_secret');
});

test('only one integration row per project and integration key is allowed', function () {
    $project = Project::factory()->create();

    ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
    ]);

    expect(fn () => ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
    ]))->toThrow(QueryException::class);
});

test('resolveGithubRelayToken returns null (never throws) for a corrupted ciphertext', function () {
    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => Project::factory()->create()->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    DB::table('project_integrations')->where('id', $projectIntegration->id)->update([
        'github_relay_token' => 'not-a-valid-encrypted-payload',
    ]);

    $projectIntegration->refresh();

    expect($projectIntegration->resolveGithubRelayToken())->toBeNull()
        ->and($projectIntegration->hasUnreadableGithubRelayToken())->toBeTrue();
});

test('resolveGithubRelayToken returns the value normally when it decrypts fine', function () {
    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => Project::factory()->create()->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);

    expect($projectIntegration->resolveGithubRelayToken())->toBe('orb_local_secret')
        ->and($projectIntegration->hasUnreadableGithubRelayToken())->toBeFalse();
});

test('hasUnreadableGithubRelayToken is false when no token was ever stored', function () {
    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => Project::factory()->create()->id,
        'integration' => 'github',
        'enabled' => true,
    ]);

    expect($projectIntegration->resolveGithubRelayToken())->toBeNull()
        ->and($projectIntegration->hasUnreadableGithubRelayToken())->toBeFalse();
});

test('deleting a project cascades to its github integration row', function () {
    $project = Project::factory()->create();

    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
    ]);

    $project->delete();

    expect(ProjectIntegration::query()->find($projectIntegration->id))->toBeNull();
});
