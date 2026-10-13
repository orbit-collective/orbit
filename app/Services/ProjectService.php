<?php

namespace App\Services;

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Repositories\ProjectRepository;
use App\Support\Cache\CachedModels;
use App\Support\Cache\CacheVersion;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProjectService
{
    /**
     * Seconds the per-user project lists stay cached. Membership and project
     * writes move the membership version, which retires them at once; the TTL
     * only bounds writes that bypass the repositories.
     */
    private const int CACHE_TTL = 600;

    public function __construct(
        protected ProjectRepository $projectRepository,
        protected ActivityLogService $activityLogService,
        protected RoleService $roleService
    ) {}

    public function createProject(array $data, int $creatorId): Project
    {
        $data['slug'] = Str::slug($data['name']);

        // A project whose creator has no owner role would be unreachable, so
        // the project, the membership and the role are created together.
        $project = DB::transaction(function () use ($data, $creatorId) {
            $project = $this->projectRepository->store($data);
            $this->projectRepository->attachMember($project, $creatorId);
            $this->roleService->syncSystemRoleForMember($project, $creatorId, RoleType::OWNER);

            return $project;
        });
        CacheVersion::bump(CacheVersion::MEMBERSHIP);
        $this->activityLogService->log($project->id, "Created project: $project->name");

        return $project;
    }

    /**
     * Every page needs the sidebar's project list, so it is cached per user.
     */
    public function getAllForUser(int $userId): Collection
    {
        $rows = CacheVersion::remember(
            CacheVersion::MEMBERSHIP,
            "user:$userId:projects:rows",
            self::CACHE_TTL,
            fn () => CachedModels::toRows($this->projectRepository->getAllForUser($userId)),
        );

        return CachedModels::hydrate(Project::class, $rows);
    }

    public function findById(int $id): ?Project
    {
        return $this->projectRepository->findById($id);
    }

    public function hasAnyProjectsForUser(int $userId): bool
    {
        return CacheVersion::remember(
            CacheVersion::MEMBERSHIP,
            "user:$userId:has-projects",
            self::CACHE_TTL,
            fn () => $this->projectRepository->hasAnyProjectsForUser($userId),
        );
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
        // Without this the uploaded files stay on disk, reachable, after the
        // project and every row describing them are gone. New uploads live on
        // the 'local' disk (see AttachmentService), but a project created
        // before that change may still have files on the legacy 'public' one.
        Storage::disk('local')->deleteDirectory("attachments/$projectId");
        Storage::disk('public')->deleteDirectory("attachments/$projectId");
    }
}
