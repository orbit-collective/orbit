<?php

namespace App\Services\Integrations\Jira;

use App\Models\ProjectIntegration;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Thin Jira Cloud REST API (v3) wrapper, Basic Auth (email + API token) per
 * ProjectIntegration::credentials. Never logs the credentials themselves or
 * a raw response body (which may carry sensitive issue content) — only the
 * request path and response status, mirroring SendWebhookNotificationJob's
 * secret-redaction convention.
 */
class JiraApiClient
{
    public function testConnection(ProjectIntegration $projectIntegration): bool
    {
        try {
            return $this->client($projectIntegration)->get('/rest/api/3/myself')->successful();
        } catch (ConnectionException) {
            return false;
        }
    }

    public function getIssueTypes(ProjectIntegration $projectIntegration): array
    {
        return $this->getJson($projectIntegration, '/rest/api/3/issuetype');
    }

    public function getStatuses(ProjectIntegration $projectIntegration): array
    {
        return $this->getJson($projectIntegration, '/rest/api/3/status');
    }

    public function getPriorities(ProjectIntegration $projectIntegration): array
    {
        return $this->getJson($projectIntegration, '/rest/api/3/priority');
    }

    /**
     * One page of a JQL search. Expands each issue's parent link so the
     * caller (JiraIntegrationImporter) can resolve epic/subtask hierarchy.
     */
    public function searchIssues(ProjectIntegration $projectIntegration, string $jql, int $startAt = 0, int $maxResults = 50): array
    {
        return $this->getJson($projectIntegration, '/rest/api/3/search', [
            'jql' => $jql,
            'startAt' => $startAt,
            'maxResults' => $maxResults,
            'fields' => 'summary,description,status,priority,issuetype,parent,labels,components,assignee,duedate',
        ]);
    }

    private function getJson(ProjectIntegration $projectIntegration, string $path, array $query = []): array
    {
        try {
            $response = $this->client($projectIntegration)->get($path, $query);
        } catch (ConnectionException) {
            Log::warning('Jira API request failed to connect', ['path' => $path]);

            throw new RuntimeException("Jira API request failed to connect: $path");
        }

        if ($response->failed()) {
            Log::warning('Jira API request failed', [
                'path' => $path,
                'status' => $response->status(),
            ]);

            $response->throw();
        }

        return $response->json();
    }

    private function client(ProjectIntegration $projectIntegration): PendingRequest
    {
        $credentials = $projectIntegration->credentials ?? [];

        return Http::baseUrl(rtrim($credentials['instance_url'] ?? '', '/'))
            ->withBasicAuth($credentials['email'] ?? '', $credentials['api_token'] ?? '')
            ->acceptJson()
            ->timeout(10);
    }
}
