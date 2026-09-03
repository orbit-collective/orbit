<?php

namespace App\Services\Integrations\Jira;

use App\Contracts\IntegrationImporter;
use App\Enums\IntegrationFieldMappingType;
use App\Jobs\ImportJiraIssuesJob;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Models\User;
use App\Repositories\IntegrationFieldMappingRepository;
use App\Repositories\ProjectIntegrationRepository;
use App\Services\ActivityLogService;
use App\Services\Integrations\IntegrationImporterRegistry;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

/**
 * Backs JiraIntegrationController: connect/test credentials, expose mapping
 * metadata + saved mappings to the settings UI, and trigger an import job.
 * Kept separate from the generic ProjectIntegrationService, which only
 * understands the webhook_url/options shape notify integrations use.
 */
class JiraIntegrationService
{
    private const string INTEGRATION_KEY = 'jira';

    public function __construct(
        protected ProjectIntegrationRepository $projectIntegrationRepository,
        protected IntegrationFieldMappingRepository $integrationFieldMappingRepository,
        protected IntegrationImporterRegistry $integrationImporterRegistry,
        protected ActivityLogService $activityLogService,
    ) {}

    /**
     * @param  array{instance_url: string, email: string, api_token: string}  $credentials
     */
    public function connect(Project $project, array $credentials): ProjectIntegration
    {
        $projectIntegration = $this->projectIntegrationRepository->updateOrCreate($project, self::INTEGRATION_KEY, [
            'credentials' => $credentials,
        ]);

        if (! $this->importer()->testConnection($projectIntegration)) {
            throw ValidationException::withMessages([
                'instance_url' => 'Could not connect to Jira with these credentials.',
            ]);
        }

        $this->activityLogService->log($project->id, 'Connected the "jira" integration');

        return $projectIntegration;
    }

    public function getMappingMetadata(ProjectIntegration $projectIntegration): array
    {
        return $this->importer()->fetchMappingMetadata($projectIntegration);
    }

    /**
     * @param  array<int, array{mapping_type: string, external_value: string, orbit_value: string, external_label?: ?string}>  $mappings
     */
    public function saveMappings(ProjectIntegration $projectIntegration, array $mappings): void
    {
        foreach ($mappings as $mapping) {
            $this->integrationFieldMappingRepository->upsert(
                $projectIntegration,
                IntegrationFieldMappingType::from($mapping['mapping_type']),
                $mapping['external_value'],
                $mapping['orbit_value'],
                $mapping['external_label'] ?? null,
            );
        }

        $this->activityLogService->log($projectIntegration->project_id, 'Updated Jira field mappings');
    }

    public function triggerImport(Project $project, ProjectIntegration $projectIntegration, User $importedBy, array $importOptions): void
    {
        ImportJiraIssuesJob::dispatch($projectIntegration, $project, $importedBy->id, $importOptions);

        $this->activityLogService->log($project->id, 'Started a Jira import', $importedBy->id);
    }

    /**
     * Everything the settings page needs to render the Jira panel, computed
     * defensively: a Jira outage should degrade the mapping UI, never break
     * the whole settings page load.
     */
    public function getSettingsExtras(Project $project): array
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, self::INTEGRATION_KEY);

        if (! $projectIntegration || empty($projectIntegration->credentials)) {
            return [
                'hasCredentials' => false,
                'instanceUrl' => null,
                'mappingMetadata' => null,
                'fieldMappings' => [],
                'lastImport' => null,
            ];
        }

        try {
            $mappingMetadata = $this->getMappingMetadata($projectIntegration);
        } catch (Throwable) {
            $mappingMetadata = null;
        }

        return [
            'hasCredentials' => true,
            'instanceUrl' => $projectIntegration->credentials['instance_url'] ?? null,
            'mappingMetadata' => $mappingMetadata,
            'fieldMappings' => $this->integrationFieldMappingRepository
                ->getAllForProjectIntegration($projectIntegration)
                ->map(fn ($mapping) => [
                    'mappingType' => $mapping->mapping_type->value,
                    'externalValue' => $mapping->external_value,
                    'externalLabel' => $mapping->external_label,
                    'orbitValue' => $mapping->orbit_value,
                ])->values()->all(),
            'lastImport' => $this->mapLastImport($projectIntegration->options['last_import'] ?? null),
        ];
    }

    /**
     * The live "N imported so far" readout for the settings UI to poll
     * while an import is running. Deliberately separate from
     * getSettingsExtras() below: that method also calls out to Jira's live
     * API for mapping metadata, which would mean hitting Jira on every
     * single poll tick (every ~1.5s while an import is in progress) if
     * this were folded into it - this reads only the local DB row.
     */
    public function getImportProgress(Project $project): ?array
    {
        $projectIntegration = $this->projectIntegrationRepository->findForProject($project, self::INTEGRATION_KEY);

        $progress = $projectIntegration?->options['import_progress'] ?? null;

        if (! $progress) {
            return null;
        }

        return [
            // ?? null: a progress blob written before this field existed.
            'runId' => $progress['run_id'] ?? null,
            'status' => $progress['status'],
            'imported' => $progress['imported'],
            'updated' => $progress['updated'],
            'skipped' => $progress['skipped'],
            'failed' => $progress['failed'],
        ];
    }

    /**
     * ImportJiraIssuesJob persists this as a plain snake_case array (it's
     * just a JSON blob it writes for itself) — reshaped to camelCase here so
     * every settings-page prop follows the same convention.
     */
    private function mapLastImport(?array $lastImport): ?array
    {
        if (! $lastImport) {
            return null;
        }

        return [
            'imported' => $lastImport['imported'],
            // ?? 0: a last_import blob written before the sync-existing
            // feature existed won't have this key.
            'updated' => $lastImport['updated'] ?? 0,
            'skipped' => $lastImport['skipped'],
            'failed' => $lastImport['failed'],
            'errors' => $lastImport['errors'],
            'ranAt' => $lastImport['ran_at'],
        ];
    }

    private function importer(): IntegrationImporter
    {
        return $this->integrationImporterRegistry->resolve(self::INTEGRATION_KEY)
            ?? throw new RuntimeException('No importer registered for the "jira" integration.');
    }
}
