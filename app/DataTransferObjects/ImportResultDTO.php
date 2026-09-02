<?php

namespace App\DataTransferObjects;

/**
 * Outcome of a single import run, produced by ImportOrchestratorService and
 * surfaced to the user (e.g. as the "last import" summary in the settings UI).
 */
final class ImportResultDTO
{
    public function __construct(
        public readonly int $imported = 0,
        public readonly int $skipped = 0,
        public readonly int $failed = 0,
        public readonly array $errors = [],
    ) {}
}
