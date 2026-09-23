<?php

use App\Models\ExternalIssueLink;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('pull request metadata is nullable and draft casts to boolean', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
    ]);

    $link = ExternalIssueLink::query()->create([
        'issue_id' => $issue->id,
        'project_integration_id' => $projectIntegration->id,
        'external_id' => '999',
        'external_key' => 'orbit-collective/orbit#283',
        'external_url' => 'https://github.com/orbit-collective/orbit/pull/283',
        'external_type' => 'github_pull_request',
        'pull_request_title' => 'Fix login redirect',
        'source_branch' => 'fix/login-redirect',
        'target_branch' => 'master',
        'status' => 'open',
        'draft' => true,
    ]);

    expect($link->fresh()->draft)->toBeTrue();

    $legacyLink = ExternalIssueLink::query()->create([
        'issue_id' => $issue->id,
        'project_integration_id' => $projectIntegration->id,
        'external_id' => '1000',
        'external_key' => 'orbit-collective/orbit#284',
        'external_url' => 'https://github.com/orbit-collective/orbit/pull/284',
        'external_type' => 'github_pull_request',
    ]);

    $legacyLink = $legacyLink->fresh();

    expect($legacyLink->pull_request_title)->toBeNull()
        ->and($legacyLink->source_branch)->toBeNull()
        ->and($legacyLink->target_branch)->toBeNull()
        ->and($legacyLink->status)->toBeNull()
        ->and($legacyLink->draft)->toBeNull();
});
