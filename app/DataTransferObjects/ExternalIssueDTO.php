<?php

namespace App\DataTransferObjects;

/**
 * Source-agnostic representation of one remote issue/epic/subtask. Every
 * import integration's only job is "fetch raw payload, map it into this" —
 * source-specific field names never leak past this boundary. The shared
 * ImportOrchestratorService consumes these regardless of which integration
 * produced them.
 */
final class ExternalIssueDTO
{
    public function __construct(
        public readonly string $externalId,
        public readonly ?string $externalKey,
        public readonly string $title,
        public readonly ?string $description,
        public readonly ?string $externalStatus,
        public readonly ?string $externalPriority,
        public readonly array $externalLabels = [],
        public readonly ?string $type = null,
        public readonly ?string $parentExternalId = null,
        public readonly ?string $assigneeExternalId = null,
        public readonly ?string $assigneeEmail = null,
        public readonly ?string $startDate = null,
        public readonly ?string $endDate = null,
        public readonly ?string $url = null,
    ) {}
}
