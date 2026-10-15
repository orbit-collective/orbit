<?php

use App\DataTransferObjects\Github\GithubRelayEventDTO;
use App\Models\GithubRepository;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Services\Integrations\Github\GithubAutomationContextBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function contextFor(Issue $issue): array
{
    $event = new GithubRelayEventDTO(
        id: 'evt_1', type: 'pull_request', action: 'opened', deliveryId: 'd_1',
        repositoryId: 1, pullRequestId: 1, pullRequestNumber: 7,
        pullRequestUrl: 'https://github.com/o/r/pull/7', pullRequestBody: null,
        pullRequestTitle: 'Fix it', pullRequestSourceBranch: 'fix', pullRequestTargetBranch: 'master',
        pullRequestDraft: false, pullRequestState: 'open', pullRequestMerged: false,
        pullRequestMergedAt: null, pullRequestUpdatedAt: null, checkStatus: null,
        reviewState: null, reviewerLogin: null, createdAt: now()->toIso8601String(),
    );

    return (new GithubAutomationContextBuilder)->build(
        $issue,
        new ProjectIntegration(['project_id' => $issue->project_id]),
        $event,
        new GithubRepository(['owner' => 'o', 'name' => 'r']),
    );
}

test('the issue in the context carries its workflow status name and category', function () {
    $issue = Issue::factory()->inProgress()->create(['project_id' => Project::factory()->create()->id]);
    $issue->workflowStatus->update(['name' => 'In Review']);

    $context = contextFor($issue->fresh());

    expect($context['issue']['status'])->toBe('In Review')
        ->and($context['issue']['category'])->toBe('in_progress');
});

test('an issue without a workflow status has a null status and category', function () {
    $issue = Issue::factory()->create(['project_id' => Project::factory()->create()->id]);

    $context = contextFor($issue);

    expect($context['issue']['status'])->toBeNull()
        ->and($context['issue']['category'])->toBeNull();
});
