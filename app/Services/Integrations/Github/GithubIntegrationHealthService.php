<?php

namespace App\Services\Integrations\Github;

use App\Models\ProjectIntegration;

/**
 * Derives operational health from a ProjectIntegration's stored reliability
 * signals - never stored itself, so it can never drift out of sync with the
 * data that justifies it. Deterministic: no time-based staleness heuristics,
 * only the connection status, the last recorded error code, and the
 * consecutive-failure count already maintained by GithubIntegrationSynchronizer.
 */
class GithubIntegrationHealthService
{
    private const array PERMANENT_ERROR_CODES = [
        'INVALID_RELAY_TOKEN',
        'AUTHORIZATION_REQUIRED',
        'INVALID_AUTHORIZATION',
        'CONNECTION_NOT_CONNECTED',
        'INCOMPLETE_CONNECTION',
    ];

    /**
     * Null for a connection that hasn't reached "connected" yet (pending, or
     * no connection at all) - health isn't a meaningful concept there, the
     * connection status itself already tells that story.
     */
    public function determine(ProjectIntegration $projectIntegration): ?GithubIntegrationHealth
    {
        return match ($projectIntegration->github_status) {
            'revoked' => GithubIntegrationHealth::Revoked,
            'connected' => $this->determineForConnected($projectIntegration),
            default => null,
        };
    }

    private function determineForConnected(ProjectIntegration $projectIntegration): GithubIntegrationHealth
    {
        if (in_array($projectIntegration->github_last_error_code, self::PERMANENT_ERROR_CODES, true)) {
            return GithubIntegrationHealth::Error;
        }

        if ($projectIntegration->github_consecutive_failures > 0) {
            return GithubIntegrationHealth::Degraded;
        }

        return GithubIntegrationHealth::Healthy;
    }
}
