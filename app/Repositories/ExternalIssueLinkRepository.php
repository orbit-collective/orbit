<?php

namespace App\Repositories;

use App\Models\ExternalIssueLink;
use App\Models\ProjectIntegration;
use Illuminate\Database\Eloquent\Collection;

class ExternalIssueLinkRepository
{
    public function existsFor(ProjectIntegration $projectIntegration, string $externalId): bool
    {
        return $this->findFor($projectIntegration, $externalId) !== null;
    }

    public function findFor(ProjectIntegration $projectIntegration, string $externalId, ?int $issueId = null): ?ExternalIssueLink
    {
        return $projectIntegration->externalIssueLinks()
            ->where('external_id', $externalId)
            ->when($issueId !== null, fn ($query) => $query->where('issue_id', $issueId))
            ->first();
    }

    /**
     * Every link of one external object: a pull request can be linked to
     * several issues, one row each.
     *
     * @return Collection<int, ExternalIssueLink>
     */
    public function getFor(ProjectIntegration $projectIntegration, string $externalId): Collection
    {
        return $projectIntegration->externalIssueLinks()
            ->where('external_id', $externalId)
            ->with('issue')
            ->get();
    }

    /**
     * The links of a set of pull requests of one integration, by their
     * `owner/name#number` key, with each link's issue - what the
     * Development view shows next to every pull request.
     *
     * @param  list<string>  $externalKeys
     * @return Collection<int, ExternalIssueLink>
     */
    public function getForPullRequestKeys(ProjectIntegration $projectIntegration, array $externalKeys): Collection
    {
        if ($externalKeys === []) {
            return new Collection;
        }

        return $projectIntegration->externalIssueLinks()
            ->where('external_type', 'github_pull_request')
            ->whereIn('external_key', $externalKeys)
            ->with('issue')
            ->get();
    }

    public function delete(ExternalIssueLink $externalIssueLink): void
    {
        $externalIssueLink->delete();
    }

    public function create(array $attributes): ExternalIssueLink
    {
        return ExternalIssueLink::query()->create($attributes);
    }

    public function touch(ExternalIssueLink $externalIssueLink, array $attributes): ExternalIssueLink
    {
        $externalIssueLink->update($attributes);

        return $externalIssueLink;
    }

    /**
     * Idempotent by (project_integration_id, external_id, issue_id) —
     * matches the table's own unique constraint, so reprocessing the same
     * relay event never creates a duplicate link. `$attributes['issue_id']`
     * is required: it says which of the pull request's issues this row is.
     */
    public function upsertFor(ProjectIntegration $projectIntegration, string $externalId, array $attributes): ExternalIssueLink
    {
        $existing = $this->findFor($projectIntegration, $externalId, $attributes['issue_id']);

        if ($existing) {
            return $this->touch($existing, $attributes);
        }

        return $this->create([
            ...$attributes,
            'project_integration_id' => $projectIntegration->id,
            'external_id' => $externalId,
        ]);
    }
}
