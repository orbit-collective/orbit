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
}
