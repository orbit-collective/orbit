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

    public function updateOrCreate(Project $project, string $integration, bool $enabled): ProjectIntegration
    {
        return $project->integrations()->updateOrCreate(
            ['integration' => $integration],
            ['enabled' => $enabled],
        );
    }
}
