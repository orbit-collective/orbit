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
        NotificationService $notificationService,
    ): void {
        $importer = $integrationImporterRegistry->resolve($this->projectIntegration->integration);

        if (! $importer) {
            Log::warning('ImportJiraIssuesJob dispatched for an integration with no registered importer', [
                'integration' => $this->projectIntegration->integration,
            ]);

            return;
        }

        $importedBy = User::query()->findOrFail($this->importedByUserId);

        try {
            $externalIssues = $importer->fetchIssues($this->projectIntegration, $this->importOptions);
            $result = $importOrchestratorService->import($this->projectIntegration, $this->project, $importedBy, $externalIssues);
        } catch (Throwable $e) {
            // Never let instance_url/email/api_token leak into logs via the
            // integration model or exception context - message only.
            Log::error('Jira import failed', [
                'project_integration_id' => $this->projectIntegration->id,
                'message' => $e->getMessage(),
            ]);

            throw $e;
        }

        $options = $this->projectIntegration->options ?? [];
        $options['last_import'] = [
            'imported' => $result->imported,
            'skipped' => $result->skipped,
            'failed' => $result->failed,
            'errors' => $result->errors,
            'ran_at' => now()->toIso8601String(),
        ];

        $projectIntegrationRepository->updateOrCreate($this->project, $this->projectIntegration->integration, ['options' => $options]);

        $notificationService->notify(
            $this->importedByUserId,
            NotificationType::IntegrationActivity,
            $result->failed > 0 ? 'warning' : 'success',
            'Jira import finished',
            "Imported {$result->imported}, skipped {$result->skipped}, failed {$result->failed} issue(s) from Jira into \"{$this->project->name}\".",
            route('settings', ['tab' => 'integrations', 'project' => $this->project->id]),
        );
    }

    /**
     * Called by the queue after every retry is exhausted - the only place
     * left to tell the importing user their import never completed at all
     * (handle()'s own try/catch only logs, then rethrows to trigger a retry).
     */
    public function failed(Throwable $exception): void
    {
        app(NotificationService::class)->notify(
            $this->importedByUserId,
            NotificationType::IntegrationActivity,
            'error',
            'Jira import failed',
            "The Jira import for \"{$this->project->name}\" failed: {$exception->getMessage()}",
            route('settings', ['tab' => 'integrations', 'project' => $this->project->id]),
        );
    }
}
