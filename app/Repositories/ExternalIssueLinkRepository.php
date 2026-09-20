<?php

namespace App\Repositories;

use App\Models\ExternalIssueLink;
use App\Models\ProjectIntegration;

class ExternalIssueLinkRepository
{
    public function existsFor(ProjectIntegration $projectIntegration, string $externalId): bool
    {
        return $this->findFor($projectIntegration, $externalId) !== null;
    }

    public function findFor(ProjectIntegration $projectIntegration, string $externalId): ?ExternalIssueLink
    {
        return $projectIntegration->externalIssueLinks()
            ->where('external_id', $externalId)
            ->first();
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
     * Idempotent by (project_integration_id, external_id) — matches the
     * table's own unique constraint, so reprocessing the same relay event
     * never creates a duplicate link.
     */
    public function upsertFor(ProjectIntegration $projectIntegration, string $externalId, array $attributes): ExternalIssueLink
    {
        $existing = $this->findFor($projectIntegration, $externalId);

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
