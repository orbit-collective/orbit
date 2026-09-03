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
     * One page of a JQL search via /rest/api/3/search/jql — the endpoint
     * that replaced the deprecated GET/POST /rest/api/3/search (which now
     * returns HTTP 410 Gone on every Jira Cloud site). That old endpoint's
     * offset pagination (startAt/total) is gone too: this one is cursor-based
     * — pass back whatever "nextPageToken" the previous page returned, and
     * there is no next page once the response omits that key entirely.
     * Expands each issue's parent link so the caller (JiraIntegrationImporter)
     * can resolve epic/subtask hierarchy.
     */
    public function searchIssues(ProjectIntegration $projectIntegration, string $jql, ?string $nextPageToken = null, int $maxResults = 50): array
    {
        $query = [
            'jql' => $jql,
            'maxResults' => $maxResults,
            'fields' => 'summary,description,status,priority,issuetype,parent,labels,components,assignee,duedate',
        ];

        if ($nextPageToken !== null) {
            $query['nextPageToken'] = $nextPageToken;
        }

        return $this->getJson($projectIntegration, '/rest/api/3/search/jql', $query);
    }

    /**
     * @throws RuntimeException on a connection failure
     * @throws \Illuminate\Http\Client\RequestException on a non-2xx response
     */
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
