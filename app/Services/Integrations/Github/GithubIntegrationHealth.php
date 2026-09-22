<?php

namespace App\Services\Integrations\Github;

/**
 * Operational health, distinct from connection status (pending/connected/
 * revoked - see ProjectIntegration::github_status). Health only applies once
 * a connection has actually been established; see
 * GithubIntegrationHealthService::determine().
 */
enum GithubIntegrationHealth: string
{
    /** Connected, no unresolved failure. */
    case Healthy = 'healthy';

    /** Connected, but the most recent sync failed transiently. */
    case Degraded = 'degraded';

    /** Connected locally, but the connection cannot function until the user reconnects. */
    case Error = 'error';

    /** The connection has been explicitly revoked. */
    case Revoked = 'revoked';
}
