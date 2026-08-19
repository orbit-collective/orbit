<?php

namespace App\Services;

use App\Models\Project;
use App\Repositories\ProjectRepository;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class ProjectService
{
    public function __construct(
        protected ProjectRepository $projectRepository,
        protected ActivityLogService $activityLogService
    ) {}

    public function createProject(array $data): Project {
        $data['slug'] = Str::slug($data['name']);
        $project = $this->projectRepository->store($data);
        $this->activityLogService->log($project->id, "Created project: $project->name");

        return $project;
    }
    public function getAll(): Collection {
        return $this->projectRepository->getAll();
    }
    public function hasAnyProjects(): bool {
        return $this->projectRepository->hasAnyProjects();
    }
    public function updateColumns(Project $project, array $newColumns): Project {
        $currentColumns = $project->columns ?? [];
        $updatedColumns = array_merge($currentColumns, $newColumns);

        $project = $this->projectRepository->update($project, ['columns' => $updatedColumns]);

        $this->activityLogService->log($project->id, "Updated visible columns configuration");

        return $project;
    }
}
