<?php

namespace App\Services\Integrations\Github;

use App\DataTransferObjects\Github\GithubRelayEventDTO;
use App\Models\Issue;
use App\Models\ProjectIntegration;

/**
 * Builds the clean Orbit-domain context array a GitHub automation trigger
 * exposes to condition evaluation and (indirectly) to action handlers.
 * Never the raw webhook payload, never a secret.
 */
class GithubAutomationContextBuilder
{
    /**
     * @return array<string, mixed>
     */
    public function build(Issue $issue, ProjectIntegration $projectIntegration, GithubRelayEventDTO $event): array
    {
        return [
            'project' => [
                'id' => $projectIntegration->project_id,
                'name' => $issue->project->name,
            ],
            'issue' => [
                'id' => $issue->id,
                'title' => $issue->title,
                'status' => $issue->status,
            ],
            'repository' => [
                'owner' => $projectIntegration->github_repository_owner,
                'name' => $projectIntegration->github_repository_name,
            ],
            'pullRequest' => [
                'number' => $event->pullRequestNumber,
                'title' => $event->pullRequestTitle,
                'url' => $event->pullRequestUrl,
                'sourceBranch' => $event->pullRequestSourceBranch,
                'targetBranch' => $event->pullRequestTargetBranch,
                'state' => $event->pullRequestState,
            ],
        ];
    }
}
