<?php

namespace App\Services\Integrations;

use App\DataTransferObjects\ExternalIssueDTO;
use App\DataTransferObjects\ImportResultDTO;
use App\Enums\IntegrationFieldMappingType;
use App\Events\IssuesImported;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Models\User;
use App\Repositories\ExternalIssueLinkRepository;
use App\Repositories\IssueRepository;
use App\Services\IssueService;
use App\Services\LabelService;
use Throwable;

/**
 * Shared consumer of ExternalIssueDTO[] regardless of which IntegrationImporter
 * produced them - this is what makes future importers (Linear, GitHub, Asana,
 * Trello) cheap: they only need to implement IntegrationImporter, everything
 * below (field mapping, dedup, hierarchy resolution, bulk issue creation)
 * is already here.
 */
class ImportOrchestratorService
{
    public function __construct(
        protected IssueService $issueService,
        protected IssueRepository $issueRepository,
        protected FieldMappingResolverService $fieldMappingResolverService,
        protected ExternalIssueLinkRepository $externalIssueLinkRepository,
        protected LabelService $labelService,
    ) {}

    /**
     * $syncExisting controls what happens to an issue that was already
     * imported in a previous run (tracked via ExternalIssueLink): false
     * (the default) leaves it untouched and counts it as skipped; true
     * overwrites it with the remote system's current data - which always
     * wins over whatever was changed locally in Orbit since the last sync.
     *
     * $onProgress, if given, is called after every processed issue with the
     * running totals so far: fn(int $imported, int $updated, int $skipped,
     * int $failed): void. This is the only progress-reporting hook the
     * orchestrator exposes - whether/how often to actually persist that
     * somewhere visible to a user (and how to throttle it) is entirely up
     * to the caller, so every future importer's job gets live progress for
     * free just by wiring this same callback, without the orchestrator
     * needing to know anything about where progress is displayed.
     */
    public function import(ProjectIntegration $projectIntegration, Project $project, User $importedBy, iterable $externalIssues, bool $syncExisting = false, ?callable $onProgress = null): ImportResultDTO
    {
        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $failed = 0;
        $errors = [];

        // Computed once per run, not per issue: a label mapping's target
        // value is a free-form string configured by whoever set up the
        // mapping, so it can point at a label that doesn't exist (anymore)
        // in this project. Filtering against this set keeps an import from
        // writing a label value onto Issue.labels that a normal issue
        // request would reject and the project can't select or resolve.
        $this->labelService->ensureSystemLabels($project);
        $validLabelNames = $this->labelService->getLabels($project)->pluck('name')->all();

        /** @var array<string, array{issue: Issue, parentExternalId: ?string}> $importedItems keyed by externalId */
        $importedItems = [];

        foreach ($externalIssues as $externalIssue) {
            $existingLink = $this->externalIssueLinkRepository->findFor($projectIntegration, $externalIssue->externalId);

            if ($existingLink && ! $syncExisting) {
                $skipped++;

                continue;
            }

            try {
                $issueData = $this->mapIssueData($projectIntegration, $project, $externalIssue, $validLabelNames);

                if ($existingLink) {
                    $issue = $this->issueService->syncImportedIssue($existingLink->issue, $issueData, $importedBy);

                    $this->externalIssueLinkRepository->touch($existingLink, [
                        'external_key' => $externalIssue->externalKey,
                        'external_url' => $externalIssue->url,
                        'external_type' => $externalIssue->type,
                        'last_synced_at' => now(),
                    ]);

                    $updated++;
                } else {
                    $issue = $this->issueService->importIssue($issueData, $importedBy);

                    $this->externalIssueLinkRepository->create([
                        'issue_id' => $issue->id,
                        'project_integration_id' => $projectIntegration->id,
                        'external_id' => $externalIssue->externalId,
                        'external_key' => $externalIssue->externalKey,
                        'external_url' => $externalIssue->url,
                        'external_type' => $externalIssue->type,
                        'last_synced_at' => now(),
                    ]);

                    $imported++;
                }

                $importedItems[$externalIssue->externalId] = [
                    'issue' => $issue,
                    'parentExternalId' => $externalIssue->parentExternalId,
                ];
            } catch (Throwable $e) {
                $failed++;
                $errors[] = ($externalIssue->externalKey ?? $externalIssue->externalId).': '.$e->getMessage();
            }

            if ($onProgress !== null) {
                $onProgress($imported, $updated, $skipped, $failed);
            }
        }

        // Second pass: resolve parent_id now that every issue in this run
        // exists, since a paginated remote result can list a child before its
        // parent (e.g. a subtask before its epic) - also re-resolves a
        // synced issue's parent in case it was reparented in the source.
        $this->resolveParents($projectIntegration, $importedItems);

        $result = new ImportResultDTO($imported, $updated, $skipped, $failed, $errors);

        event(new IssuesImported($project, $importedBy, $result));

        return $result;
    }

    /**
     * @param  list<string>  $validLabelNames
     */
    private function mapIssueData(ProjectIntegration $projectIntegration, Project $project, ExternalIssueDTO $externalIssue, array $validLabelNames): array
    {
        $data = [
            'title' => $externalIssue->title,
            'description' => $externalIssue->description,
            'project_id' => $project->id,
            'start_date' => $externalIssue->startDate,
            'end_date' => $externalIssue->endDate,
        ];

        if ($externalIssue->externalStatus !== null) {
            $data['status'] = $this->fieldMappingResolverService->resolve(
                $projectIntegration, IntegrationFieldMappingType::STATUS, $externalIssue->externalStatus,
            );
        }

        if ($externalIssue->externalPriority !== null) {
            $data['priority'] = $this->fieldMappingResolverService->resolve(
                $projectIntegration, IntegrationFieldMappingType::PRIORITY, $externalIssue->externalPriority,
            );
        }

        // Each project defines its own label taxonomy - an unmapped remote
        // label/component is simply omitted rather than forcing a match, and
        // so is a mapping whose configured target no longer exists as a
        // label in this project.
        $labels = collect($externalIssue->externalLabels)
            ->map(fn (string $label) => $this->fieldMappingResolverService->resolve(
                $projectIntegration, IntegrationFieldMappingType::LABEL, $label,
            ))
            ->filter()
            ->filter(fn (string $label) => in_array($label, $validLabelNames, true))
            ->unique()
            ->values()
            ->all();

        if (! empty($labels)) {
            $data['labels'] = $labels;
        }

        return $data;
    }

    /**
     * @param  array<string, array{issue: Issue, parentExternalId: ?string}>  $importedItems
     */
    private function resolveParents(ProjectIntegration $projectIntegration, array $importedItems): void
    {
        foreach ($importedItems as $item) {
            $parentExternalId = $item['parentExternalId'];

            if ($parentExternalId === null) {
                $this->issueRepository->update($item['issue'], ['parent_id' => null]);

                continue;
            }

            $parentIssue = $importedItems[$parentExternalId]['issue']
                ?? $this->externalIssueLinkRepository->findFor($projectIntegration, $parentExternalId)?->issue;

            if (! $parentIssue) {
                continue;
            }

            $this->issueRepository->update($item['issue'], ['parent_id' => $parentIssue->id]);
        }
    }
}
