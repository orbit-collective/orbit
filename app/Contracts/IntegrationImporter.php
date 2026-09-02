<?php

namespace App\Contracts;

use App\Models\ProjectIntegration;

/**
 * One implementation per import-capable integration key (see
 * IntegrationImporterRegistry). This is the inbound counterpart to
 * IntegrationNotifier: instead of reacting to a domain event, it's invoked
 * by a user action (connect / fetch mapping metadata / import) via a
 * controller and queued job, since pulling from a remote system isn't
 * "something that happened in Orbit."
 *
 * Adding a new import integration (Linear, GitHub, Asana, Trello, ...) is:
 * implement this, register it in the registry's map, map its raw payload
 * into ExternalIssueDTO — the rest of the import pipeline
 * (ImportOrchestratorService, field mapping, hierarchy resolution, bulk
 * issue creation) is shared and needs no changes.
 */
interface IntegrationImporter
{
    /**
     * Verifies the stored credentials can actually reach the remote system.
     */
    public function testConnection(ProjectIntegration $projectIntegration): bool;

    /**
     * Returns the remote system's configurable statuses/priorities/issue
     * types (shape: ['statuses' => [...], 'priorities' => [...], 'issueTypes' => [...]]),
     * each entry describing at minimum a raw value and a display label, so
     * the field-mapping UI can offer them for mapping to Orbit's fixed enums.
     */
    public function fetchMappingMetadata(ProjectIntegration $projectIntegration): array;

    /**
     * Streams the remote issues (and their epics/subtasks) to import.
     *
     * @return iterable<\App\DataTransferObjects\ExternalIssueDTO>
     */
    public function fetchIssues(ProjectIntegration $projectIntegration, array $options = []): iterable;
}
