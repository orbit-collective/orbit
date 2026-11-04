<?php

namespace App\Services\DeveloperPortal;

use App\Repositories\DeveloperPortalRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * Assembles what the Developer Portal shows. Totals and lists are read
 * straight from the database on purpose (a handful of indexed aggregates and
 * one page of rows): a live push must always re-read fresh numbers, which a
 * cache would defeat. Plain arrays only.
 */
class DeveloperPortalService
{
    public const string USERS_PAGE = 'users_page';

    public const string PROJECTS_PAGE = 'projects_page';

    public const string USERS_PER_PAGE = 'users_perPage';

    public const string PROJECTS_PER_PAGE = 'projects_perPage';

    public function __construct(private DeveloperPortalRepository $repository) {}

    /**
     * @return array{users: int, projects: int, issues: int, comments: int, newIssues: int, newUsers: int, recentDays: int, categories: array{todo: int, in_progress: int, done: int}}
     */
    public function totals(): array
    {
        $days = (int) config('developer-portal.errors.days');

        return [...$this->repository->totals($days), 'recentDays' => $days];
    }

    /** @return LengthAwarePaginator<int, array<string, mixed>> */
    public function users(int $perPage, ?string $search = null): LengthAwarePaginator
    {
        return $this->repository->paginateUsers($this->perPage($perPage), self::USERS_PAGE, $search)
            ->through(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'projectsCount' => (int) $user->projects_count,
                'createdAt' => $user->created_at?->toIso8601String(),
            ]);
    }

    /** @return LengthAwarePaginator<int, array<string, mixed>> */
    public function projects(int $perPage, ?string $search = null): LengthAwarePaginator
    {
        $page = $this->repository->paginateProjects($this->perPage($perPage), self::PROJECTS_PAGE, $search);
        $counts = $this->repository->issueCountsByCategory($page->getCollection()->pluck('id')->all());

        return $page->through(fn ($project) => [
            'id' => $project->id,
            'name' => $project->name,
            'slug' => $project->slug,
            'color' => $project->color,
            'membersCount' => (int) $project->users_count,
            'issues' => $counts[$project->id] ?? ['todo' => 0, 'in_progress' => 0, 'done' => 0],
            'createdAt' => $project->created_at?->toIso8601String(),
        ]);
    }

    private function perPage(int $requested): int
    {
        $default = (int) config('developer-portal.per_page');

        return $requested > 0 ? min($requested, 100) : $default;
    }
}
