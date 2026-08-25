<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Repositories\ProjectIntegrationRepository;
use Illuminate\Validation\ValidationException;

class ProjectIntegrationService
{
    /**
     * The only integration actually wired up so far. Every other catalog entry
     * shown on the frontend is locked as "coming soon" — enforced here too, so
     * the restriction doesn't rely on the frontend alone.
     */
    public const array AVAILABLE_INTEGRATIONS = ['discord'];

    public function __construct(
        protected ProjectIntegrationRepository $projectIntegrationRepository,
        protected ActivityLogService $activityLogService,
    ) {}

    /**
     * @return array<string, bool> enabled state keyed by integration id, for every
     *                              currently available integration.
     */
    public function getStatuses(Project $project): array
    {
        $statuses = array_fill_keys(self::AVAILABLE_INTEGRATIONS, false);

        foreach ($this->projectIntegrationRepository->getForProject($project) as $integration) {
            if (array_key_exists($integration->integration, $statuses)) {
                $statuses[$integration->integration] = $integration->enabled;
            }
        }

        return $statuses;
    }

    public function setEnabled(Project $project, string $integration, bool $enabled): ProjectIntegration
    {
        if (! in_array($integration, self::AVAILABLE_INTEGRATIONS, true)) {
            throw ValidationException::withMessages([
                'integration' => 'This integration is not available yet.',
            ]);
        }

        $record = $this->projectIntegrationRepository->updateOrCreate($project, $integration, $enabled);

        $action = $enabled ? 'Enabled' : 'Disabled';
        $this->activityLogService->log($project->id, "$action the \"$integration\" integration");

        return $record;
    }
}
