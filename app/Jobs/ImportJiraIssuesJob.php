<?php

namespace App\Jobs;

use App\Enums\Notifications\NotificationType;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Models\User;
use App\Repositories\ProjectIntegrationRepository;
use App\Services\Integrations\ImportOrchestratorService;
use App\Services\Integrations\IntegrationImporterRegistry;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Runs the fetch → DTO → map → bulk-create pipeline for one Jira project
 * integration (mirrors SendWebhookNotificationJob's ShouldQueue/tries/backoff
 * shape). Unlike that job, this one does NOT need ShouldBeEncrypted: the
 * ProjectIntegration/Project constructor args are serialized by
 * SerializesModels as model-key references, not their raw attributes, so no
 * plaintext Jira credential ever enters the queue payload — they're only
 * decrypted when the model is re-fetched at handle() time.
 */
class ImportJiraIssuesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public readonly ProjectIntegration $projectIntegration,
        public readonly Project $project,
        public readonly int $importedByUserId,
        public readonly array $importOptions = [],
    ) {}

    public function backoff(): array
    {
        return [5, 15, 30];
    }

    public function handle(
        IntegrationImporterRegistry $integrationImporterRegistry,
        ImportOrchestratorService $importOrchestratorService,
        ProjectIntegrationRepository $projectIntegrationRepository,
    ): void {
        $importer = $integrationImporterRegistry->resolve($this->projectIntegration->integration);

        if (! $importer) {
            Log::warning('ImportJiraIssuesJob dispatched for an integration with no registered importer', [
                'integration' => $this->projectIntegration->integration,
            ]);

            return;
        }

        $importedBy = User::query()->findOrFail($this->importedByUserId);

        $syncExisting = (bool) ($this->importOptions['sync_existing'] ?? false);

        // Kept as one local variable for the whole run (rather than
        // re-reading $this->projectIntegration->options later) since the
        // model's in-memory attributes never see the writes made through
        // $projectIntegrationRepository below - re-deriving from them at
        // the end would silently discard every progress update made here.
        $options = $this->projectIntegration->options ?? [];
        $options['import_progress'] = $this->progressPayload('running', 0, 0, 0, 0);
        $projectIntegrationRepository->updateOrCreate($this->project, $this->projectIntegration->integration, ['options' => $options]);

        $lastPersistedProcessed = 0;

        // Throttled to roughly every 3rd processed issue (but never misses
        // the very first one, so the UI shows movement quickly) rather than
        // writing to the database on every single issue.
        $onProgress = function (int $imported, int $updated, int $skipped, int $failed) use (&$options, &$lastPersistedProcessed, $projectIntegrationRepository) {
            $processed = $imported + $updated + $skipped + $failed;

            if ($processed !== 1 && $processed - $lastPersistedProcessed < 3) {
                return;
            }

            $lastPersistedProcessed = $processed;
            $options['import_progress'] = $this->progressPayload('running', $imported, $updated, $skipped, $failed);

            $projectIntegrationRepository->updateOrCreate($this->project, $this->projectIntegration->integration, ['options' => $options]);
        };

        try {
            $externalIssues = $importer->fetchIssues($this->projectIntegration, $this->importOptions);
            $result = $importOrchestratorService->import($this->projectIntegration, $this->project, $importedBy, $externalIssues, $syncExisting, $onProgress);
        } catch (Throwable $e) {
            // Never let instance_url/email/api_token leak into logs via the
            // integration model or exception context - message only.
            Log::error('Jira import failed', [
                'project_integration_id' => $this->projectIntegration->id,
                'message' => $e->getMessage(),
            ]);

            throw $e;
        }

        $options['last_import'] = [
            'imported' => $result->imported,
            'updated' => $result->updated,
            'skipped' => $result->skipped,
            'failed' => $result->failed,
            'errors' => $result->errors,
            'ran_at' => now()->toIso8601String(),
        ];
        $options['import_progress'] = $this->progressPayload('done', $result->imported, $result->updated, $result->skipped, $result->failed);

        $projectIntegrationRepository->updateOrCreate($this->project, $this->projectIntegration->integration, ['options' => $options]);

        // Telling the importing user how it went is handled by
        // SendNotificationListener reacting to the IssuesImported event
        // ImportOrchestratorService::import() just fired above - not here,
        // so any future consumer of that event (e.g. a Discord notifier
        // posting an import summary) gets it independently, without this
        // job needing to know or care who else is listening.
    }

    /**
     * Called by the queue after every retry is exhausted - the only place
     * left to tell the importing user their import never completed at all
     * (handle()'s own try/catch only logs, then rethrows to trigger a retry).
     */
    public function failed(Throwable $exception): void
    {
        $options = $this->projectIntegration->options ?? [];
        $options['import_progress'] = $this->progressPayload('failed', 0, 0, 0, 0);

        app(ProjectIntegrationRepository::class)->updateOrCreate($this->project, $this->projectIntegration->integration, ['options' => $options]);

        app(NotificationService::class)->notify(
            $this->importedByUserId,
            NotificationType::IntegrationActivity,
            'error',
            'Jira import failed',
            "The Jira import for \"{$this->project->name}\" failed: {$exception->getMessage()}",
            route('settings', ['tab' => 'integrations', 'project' => $this->project->id]),
        );
    }

    /**
     * @return array{status: string, imported: int, updated: int, skipped: int, failed: int}
     */
    private function progressPayload(string $status, int $imported, int $updated, int $skipped, int $failed): array
    {
        return [
            'status' => $status,
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'failed' => $failed,
        ];
    }
}
