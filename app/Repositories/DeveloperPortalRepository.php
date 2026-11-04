<?php

namespace App\Repositories;

use App\Models\Comment;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use App\Support\LikePattern;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

/**
 * Instance-wide queries for the Developer Portal. Unlike every other
 * repository these are not scoped to a user's memberships on purpose: the
 * portal is a local-development diagnostics page.
 */
class DeveloperPortalRepository
{
    public function __construct(private ProjectRepository $projects) {}

    /**
     * Totals across the whole instance, each a single aggregate query.
     *
     * @return array{users: int, projects: int, issues: int, comments: int, newIssues: int, newUsers: int, categories: array{todo: int, in_progress: int, done: int}}
     */
    public function totals(int $recentDays): array
    {
        $since = CarbonImmutable::now()->subDays($recentDays);

        $categories = ['todo' => 0, 'in_progress' => 0, 'done' => 0];

        DB::table('issues')
            ->leftJoin('workflow_statuses', 'issues.workflow_status_id', '=', 'workflow_statuses.id')
            ->selectRaw("COALESCE(workflow_statuses.category, 'todo') as category, COUNT(*) as total")
            ->groupBy('category')
            ->get()
            ->each(function ($row) use (&$categories) {
                $categories[$row->category] = ($categories[$row->category] ?? 0) + (int) $row->total;
            });

        return [
            'users' => User::query()->count(),
            'projects' => Project::query()->count(),
            'issues' => array_sum($categories),
            'comments' => Comment::query()->count(),
            'newIssues' => Issue::query()->where('created_at', '>=', $since)->count(),
            'newUsers' => User::query()->where('created_at', '>=', $since)->count(),
            'categories' => $categories,
        ];
    }

    /** Users, newest first, each with how many projects they belong to. */
    public function paginateUsers(int $perPage, string $pageName, ?string $search = null): LengthAwarePaginator
    {
        return User::query()
            ->select(['id', 'name', 'email', 'avatar', 'created_at'])
            ->withCount('projects')
            ->when($search, fn ($query, string $term) => $query->where(function ($query) use ($term) {
                $like = LikePattern::contains($term);
                $query->where('name', 'like', $like)->orWhere('email', 'like', $like);
            }))
            ->latest('id')
            ->paginate($perPage, pageName: $pageName);
    }

    /** Projects, newest first, each with its member count. */
    public function paginateProjects(int $perPage, string $pageName, ?string $search = null): LengthAwarePaginator
    {
        return Project::query()
            ->select(['id', 'name', 'slug', 'color', 'created_at'])
            ->withCount('users')
            ->when($search, fn ($query, string $term) => $query->where(function ($query) use ($term) {
                $like = LikePattern::contains($term);
                $query->where('name', 'like', $like)->orWhere('slug', 'like', $like);
            }))
            ->latest('id')
            ->paginate($perPage, pageName: $pageName);
    }

    /**
     * Issues per workflow status category for the given projects.
     *
     * @param  array<int, int>  $projectIds
     * @return array<int, array{todo: int, in_progress: int, done: int}>
     */
    public function issueCountsByCategory(array $projectIds): array
    {
        return $this->projects->issueCountsByCategory($projectIds);
    }
}
