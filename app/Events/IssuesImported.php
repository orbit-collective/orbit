<?php

namespace App\Events;

use App\DataTransferObjects\ImportResultDTO;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Fired once per import run, by ImportOrchestratorService::import(), after
 * every issue in the run has been processed - regardless of outcome (this
 * fires even if everything was skipped/failed; filtering belongs in the
 * listener, not here, same rule every other event in this app follows).
 * Currently only SendNotificationListener reacts to it (tells the
 * importing user how their import went), but it's a generic "an import
 * finished" fact any future integration (e.g. a Discord notifier posting
 * an import summary) could also subscribe to independently.
 */
final class IssuesImported
{
    use Dispatchable;

    public function __construct(
        public readonly Project $project,
        public readonly User $importedBy,
        public readonly ImportResultDTO $result,
    ) {}
}
