<?php

namespace App\Repositories;

use App\Models\Project;
use App\Support\Cache\CacheVersion;
use App\Support\LikePattern;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ProjectRepository
{
    public function getAllForUser(int $userId): Collection
    {
        return Project::query()
            ->whereHas('users', fn ($query) => $query->where('users.id', $userId))
            ->latest()
            ->get();
    }

    /**
     * How many issues each project has per workflow status category, as
     * [projectId => ['todo' => n, 'in_progress' => n, 'done' => n]] with every
     * project and category present. One grouped query, so the project cards
     * don't need every issue row just to count them. An issue without a
     * workflow status counts as to do.
     *
     * @param  array<int, int>  $projectIds
     * @return array<int, array{todo: int, in_progress: int, done: int}>
     */
    public function issueCountsByCategory(array $projectIds): array
    {
        $counts = array_fill_keys($projectIds, ['todo' => 0, 'in_progress' => 0, 'done' => 0]);

        $rows = DB::table('issues')
            ->leftJoin('workflow_statuses', 'issues.workflow_status_id', '=', 'workflow_statuses.id')
            ->whereIn('issues.project_id', $projectIds)
            ->selectRaw("issues.project_id, COALESCE(workflow_statuses.category, 'todo') as category, COUNT(*) as total")
            ->groupBy('issues.project_id', 'category')
            ->get();

        foreach ($rows as $row) {
            // Summed, not assigned: an issue with no status groups apart from the
            // to-do ones but is reported under the same category.
            $counts[$row->project_id][$row->category] += (int) $row->total;
        }

        return $counts;
    }

    /**
     * Projects the user is a member of whose name contains the query, for the
     * command palette. Name prefix ranks above a mere substring, then most
     * recently updated.
     */
    public function searchForUser(int $userId, string $q, int $limit = 5): Collection
    {
        $escape = LikePattern::ESCAPE;

        return Project::query()
            ->whereHas('users', fn ($query) => $query->where('users.id', $userId))
            ->whereRaw("LOWER(projects.name) LIKE ? ESCAPE '{$escape}'", [LikePattern::contains($q)])
            ->orderByRaw("CASE WHEN LOWER(projects.name) LIKE ? ESCAPE '{$escape}' THEN 0 ELSE 1 END", [LikePattern::startsWith($q)])
            ->orderByDesc('projects.updated_at')
            ->orderByDesc('projects.id')
            ->limit($limit)
            ->get();
    }

    public function findBySlug(string $slug): ?Project
    {
        return Project::query()->where('slug', $slug)->firstOrFail();
    }

    public function findById(int $id): ?Project
    {
        return Project::query()->find($id);
    }

    public function store(array $data): Project
    {
        return Project::query()->create($data);
    }

    public function update(Project $project, array $data): Project
    {
        $project->update($data);
        CacheVersion::bump(CacheVersion::MEMBERSHIP);

        return $project;
    }

    public function hasAnyProjectsForUser(int $userId): bool
    {
        return Project::query()
            ->whereHas('users', fn ($query) => $query->where('users.id', $userId))
            ->exists();
    }

    public function attachMember(Project $project, int $userId): void
    {
        $project->users()->attach($userId);
        CacheVersion::bump(CacheVersion::MEMBERSHIP);
    }

    /**
     * @return list<int>
     */
    public function getMemberIds(Project $project): array
    {
        return $project->users()->pluck('users.id')->all();
    }

    public function delete(Project $project): void
    {
        $project->delete();
        CacheVersion::bump(CacheVersion::MEMBERSHIP);
    }
}
