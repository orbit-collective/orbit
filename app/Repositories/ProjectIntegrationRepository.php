<?php

namespace App\Repositories;

use App\Models\Project;
use App\Models\ProjectIntegration;
use Illuminate\Database\Eloquent\Collection;

class ProjectIntegrationRepository
{
    public function getForProject(Project $project): Collection
    {
        return $project->integrations()->get();
    }

    public function getEnabledForProject(Project $project): Collection
    {
        return $project->integrations()->where('enabled', true)->get();
    }

    public function findForProject(Project $project, string $integration): ?ProjectIntegration
    {
        return $project->integrations()->where('integration', $integration)->first();
    }

    public function updateOrCreate(Project $project, string $integration, array $attributes): ProjectIntegration
    {
        return $project->integrations()->updateOrCreate(
            ['integration' => $integration],
            $attributes,
        );
    }

    /**
     * Every project's connected GitHub integration, across all projects —
     * what the relay-event poller iterates each tick.
     */
    public function getConnectedGithubIntegrations(): Collection
    {
        return ProjectIntegration::query()
            ->where('integration', 'github')
            ->where('github_status', 'connected')
            ->get();
    }
}
