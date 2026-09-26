<?php

namespace App\Console\Commands;

use App\Repositories\ProjectIntegrationRepository;
use App\Services\Automation\AutomationDefaultsService;
use Illuminate\Console\Command;

/**
 * One-off backfill for projects that connected GitHub before
 * AutomationDefaultsService existed - new connections seed these
 * automatically (see GithubIntegrationService::syncFromRelay()), so this
 * only ever needs to run once per environment after deploying that change.
 * Safe to run again later: seedGithubDefaultsForProject() is idempotent by
 * rule name.
 */
class SeedDefaultGithubAutomations extends Command
{
    protected $signature = 'automation:seed-github-defaults';

    protected $description = 'Seed default automation rules for every already-connected GitHub project';

    public function handle(
        ProjectIntegrationRepository $projectIntegrationRepository,
        AutomationDefaultsService $automationDefaultsService,
    ): int {
        $connectedIntegrations = $projectIntegrationRepository->getConnectedGithubIntegrations();
        $totalCreated = 0;

        foreach ($connectedIntegrations as $projectIntegration) {
            $created = $automationDefaultsService->seedGithubDefaultsForProject($projectIntegration->project);
            $totalCreated += $created;

            if ($created > 0) {
                $this->info("Project {$projectIntegration->project_id}: created {$created} rule(s).");
            }
        }

        $this->info("Done. {$totalCreated} rule(s) created across {$connectedIntegrations->count()} connected project(s).");

        return self::SUCCESS;
    }
}
