<?php

namespace App\Repositories;

use App\Models\GithubRepository;
use App\Models\ProjectIntegration;
use Illuminate\Support\Collection;

class GithubRepositoryRepository
{
    /**
     * Always queries fresh rather than reading the (possibly stale, cached)
     * $projectIntegration->githubRepositories relation property - callers
     * like syncForIntegration() create/delete rows on the same
     * ProjectIntegration instance within one request, and a cached
     * collection would silently keep returning what was true before those
     * writes.
     */
    public function getForIntegration(ProjectIntegration $projectIntegration): Collection
    {
        return $projectIntegration->githubRepositories()->get();
    }

    public function findByRepositoryId(ProjectIntegration $projectIntegration, int $repositoryId): ?GithubRepository
    {
        return $projectIntegration->githubRepositories()
            ->where('repository_id', $repositoryId)
            ->first();
    }

    public function create(ProjectIntegration $projectIntegration, int $repositoryId, string $owner, string $name): GithubRepository
    {
        return $projectIntegration->githubRepositories()->create([
            'repository_id' => $repositoryId,
            'owner' => $owner,
            'name' => $name,
        ]);
    }

    public function delete(GithubRepository $githubRepository): void
    {
        $githubRepository->delete();
    }

    /**
     * Reconciles the local table to exactly match the given list from
     * orbit-api: creates anything missing, removes anything no longer
     * present. Existing rows for a repository id are left untouched
     * (matched only on repository_id, not owner/name, so a rename on
     * GitHub's side doesn't spuriously delete+recreate the row).
     */
    public function syncForIntegration(ProjectIntegration $projectIntegration, array $repositories): void
    {
        $existing = $this->getForIntegration($projectIntegration)->keyBy('repository_id');
        $incomingIds = collect($repositories)->pluck('id')->all();

        foreach ($repositories as $repository) {
            $current = $existing->get($repository['id']);

            if (! $current) {
                $this->create($projectIntegration, $repository['id'], $repository['owner'], $repository['name']);

                continue;
            }

            if ($current->owner !== $repository['owner'] || $current->name !== $repository['name']) {
                $current->update(['owner' => $repository['owner'], 'name' => $repository['name']]);
            }
        }

        foreach ($existing as $repositoryId => $githubRepository) {
            if (! in_array($repositoryId, $incomingIds, true)) {
                $this->delete($githubRepository);
            }
        }
    }
}
