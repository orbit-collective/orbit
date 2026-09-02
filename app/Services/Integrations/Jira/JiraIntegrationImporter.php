<?php

namespace App\Services\Integrations\Jira;

use App\Contracts\IntegrationImporter;
use App\DataTransferObjects\ExternalIssueDTO;
use App\Models\ProjectIntegration;
use Generator;

/**
 * Translates Jira's REST API shape into the source-agnostic ExternalIssueDTO
 * once, here — nothing past this class knows Jira's field paths
 * (fields.issuetype.name, fields.parent.id, ADF descriptions, ...).
 */
class JiraIntegrationImporter implements IntegrationImporter
{
    private const int PAGE_SIZE = 50;

    public function __construct(protected JiraApiClient $jiraApiClient) {}

    public function testConnection(ProjectIntegration $projectIntegration): bool
    {
        return $this->jiraApiClient->testConnection($projectIntegration);
    }

    public function fetchMappingMetadata(ProjectIntegration $projectIntegration): array
    {
        return [
            'statuses' => $this->toMetadataOptions($this->jiraApiClient->getStatuses($projectIntegration)),
            'priorities' => $this->toMetadataOptions($this->jiraApiClient->getPriorities($projectIntegration)),
            'issueTypes' => $this->toMetadataOptions($this->jiraApiClient->getIssueTypes($projectIntegration)),
        ];
    }

    /**
     * $options['project_key'] selects the Jira project to pull from;
     * $options['jql'] can override the query entirely for callers that need
     * more control (e.g. re-importing a specific set of issues).
     *
     * @return Generator<ExternalIssueDTO>
     */
    public function fetchIssues(ProjectIntegration $projectIntegration, array $options = []): Generator
    {
        $jql = $options['jql'] ?? 'project = "'.($options['project_key'] ?? '').'" ORDER BY key ASC';

        $startAt = 0;

        do {
            $page = $this->jiraApiClient->searchIssues($projectIntegration, $jql, $startAt, self::PAGE_SIZE);
            $issues = $page['issues'] ?? [];

            foreach ($issues as $issue) {
                yield $this->mapIssue($projectIntegration, $issue);
            }

            $startAt += count($issues);
            $total = $page['total'] ?? 0;
        } while ($issues !== [] && $startAt < $total);
    }

    private function mapIssue(ProjectIntegration $projectIntegration, array $issue): ExternalIssueDTO
    {
        $fields = $issue['fields'] ?? [];

        $labels = array_values(array_filter([
            ...($fields['labels'] ?? []),
            ...array_map(fn (array $component) => $component['name'] ?? null, $fields['components'] ?? []),
        ]));

        $instanceUrl = rtrim($projectIntegration->credentials['instance_url'] ?? '', '/');

        return new ExternalIssueDTO(
            externalId: (string) $issue['id'],
            externalKey: $issue['key'] ?? null,
            title: $fields['summary'] ?? '(no title)',
            description: $this->adfToPlainText($fields['description'] ?? null),
            externalStatus: $fields['status']['name'] ?? null,
            externalPriority: $fields['priority']['name'] ?? null,
            externalLabels: $labels,
            type: $fields['issuetype']['name'] ?? null,
            parentExternalId: isset($fields['parent']['id']) ? (string) $fields['parent']['id'] : null,
            assigneeExternalId: $fields['assignee']['accountId'] ?? null,
            assigneeEmail: $fields['assignee']['emailAddress'] ?? null,
            endDate: $fields['duedate'] ?? null,
            url: $instanceUrl && isset($issue['key']) ? "$instanceUrl/browse/{$issue['key']}" : null,
        );
    }

    /**
     * Jira Cloud's v3 API returns `description` as Atlassian Document
     * Format (a nested JSON node tree), not plain text — this walks it and
     * concatenates every text leaf. Best-effort: formatting/marks are
     * dropped, which is an acceptable loss for an imported issue body.
     */
    private function adfToPlainText(mixed $description): ?string
    {
        if ($description === null) {
            return null;
        }

        if (is_string($description)) {
            return $description;
        }

        return $this->extractAdfText($description) ?: null;
    }

    private function extractAdfText(array $node): string
    {
        $text = $node['text'] ?? '';

        foreach ($node['content'] ?? [] as $child) {
            $text .= ($text !== '' ? "\n" : '').$this->extractAdfText($child);
        }

        return trim($text);
    }

    private function toMetadataOptions(array $items): array
    {
        return array_map(fn (array $item) => [
            'value' => $item['name'] ?? $item['id'],
            'label' => $item['name'] ?? $item['id'],
        ], $items);
    }
}
