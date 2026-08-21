<?php

namespace App\Services;

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Repositories\ProjectRepository;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class ProjectService
{
    public function __construct(
        protected ProjectRepository $projectRepository,
        protected ActivityLogService $activityLogService,
        protected RoleService $roleService
    ) {}

    public function createProject(array $data, int $creatorId): Project {
        $data['slug'] = Str::slug($data['name']);
        $project = $this->projectRepository->store($data);
        $this->projectRepository->attachMember($project, $creatorId, RoleType::OWNER);
        $this->roleService->syncSystemRoleForMember($project, $creatorId, RoleType::OWNER);
        $this->activityLogService->log($project->id, "Created project: $project->name");

        return $project;
    }
    public function getAllForUser(int $userId): Collection {
        return $this->projectRepository->getAllForUser($userId);
    }
    public function hasAnyProjectsForUser(int $userId): bool {
        return $this->projectRepository->hasAnyProjectsForUser($userId);
    }
    public function updateColumns(Project $project, array $newColumns): Project {
        $currentColumns = $project->columns ?? [];
        $updatedColumns = array_merge($currentColumns, $newColumns);

        $project = $this->projectRepository->update($project, ['columns' => $updatedColumns]);

        $this->activityLogService->log($project->id, "Updated visible columns configuration");

        return $project;
    }

    public function updateDetails(Project $project, array $data): Project
    {
        $project = $this->projectRepository->update($project, $data);

        $this->activityLogService->log($project->id, "Updated project details");

        return $project;
    }

    public function deleteProject(Project $project): void
    {
        $this->projectRepository->delete($project);
    }
}
