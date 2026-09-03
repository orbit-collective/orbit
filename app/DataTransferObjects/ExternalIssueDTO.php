<?php

namespace App\DataTransferObjects;

/**
 * Source-agnostic representation of one remote issue/epic/subtask. Every
 * import integration's only job is "fetch raw payload, map it into this" —
 * source-specific field names never leak past this boundary. The shared
 * ImportOrchestratorService consumes these regardless of which integration
 * produced them.
 */
final readonly class ExternalIssueDTO
{
    public function __construct(
        public string $externalId,
        public ?string $externalKey,
        public string $title,
        public ?string $description,
        public ?string $externalStatus,
        public ?string $externalPriority,
        public array $externalLabels = [],
        public ?string $type = null,
        public ?string $parentExternalId = null,
        public ?string $assigneeExternalId = null,
        public ?string $assigneeEmail = null,
        public ?string $startDate = null,
        public ?string $endDate = null,
        public ?string $url = null,
    ) {}
}
