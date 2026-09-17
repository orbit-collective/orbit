<?php

namespace App\Services;

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Repositories\ProjectRepository;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProjectService
{
    public function __construct(
        protected ProjectRepository $projectRepository,
        protected ActivityLogService $activityLogService,
        protected RoleService $roleService
    ) {}

    public function createProject(array $data, int $creatorId): Project
    {
        $data['slug'] = Str::slug($data['name']);
        $project = $this->projectRepository->store($data);
        $this->projectRepository->attachMember($project, $creatorId, RoleType::OWNER);
        $this->roleService->syncSystemRoleForMember($project, $creatorId, RoleType::OWNER);
        $this->activityLogService->log($project->id, "Created project: $project->name");

        return $project;
    }

    public function getAllForUser(int $userId): Collection
    {
        return $this->projectRepository->getAllForUser($userId);
    }

    public function findById(int $id): ?Project
    {
        return $this->projectRepository->findById($id);
    }

    public function hasAnyProjectsForUser(int $userId): bool
    {
        return $this->projectRepository->hasAnyProjectsForUser($userId);
    }

    public function updateColumns(Project $project, array $newColumns): Project
    {
        $currentColumns = $project->columns ?? [];
        $updatedColumns = array_merge($currentColumns, $newColumns);

        $project = $this->projectRepository->update($project, ['columns' => $updatedColumns]);

        $this->activityLogService->log($project->id, 'Updated visible columns configuration');

        return $project;
    }

    public function updateDetails(Project $project, array $data): Project
    {
        $project = $this->projectRepository->update($project, $data);

        $this->activityLogService->log($project->id, 'Updated project details');

        return $project;
    }

    public function deleteProject(Project $project): void
    {
        $projectId = $project->id;

        $this->projectRepository->delete($project);

        // The attachments table cascades on the foreign key, which never runs
        // an Eloquent delete and so never reaches AttachmentService::delete().
        // Without this the uploaded files stay on the public disk, reachable,
        // after the project and every row describing them are gone.
        Storage::disk('public')->deleteDirectory("attachments/$projectId");
    }
}
