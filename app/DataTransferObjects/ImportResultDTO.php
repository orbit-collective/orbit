<?php

namespace App\DataTransferObjects;

/**
 * Outcome of a single import run, produced by ImportOrchestratorService and
 * surfaced to the user (e.g. as the "last import" summary in the settings UI).
 */
final readonly class ImportResultDTO
{
    public function __construct(
        public int $imported = 0,
        public int $updated = 0,
        public int $skipped = 0,
        public int $failed = 0,
        public array $errors = [],
    ) {}
}
