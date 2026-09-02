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
}
