import { IntegrationId } from '@/types/Integrations';

/** The integrations overview, scoped to a project when one is given. */
export function integrationsPath(projectId?: number | null): string {
    return projectId == null
        ? '/settings/integrations'
        : `/settings/integrations?project=${projectId}`;
}

/** One integration's own page, scoped to a project when one is given. */
export function integrationPath(
    integrationId: IntegrationId,
    projectId?: number | null,
): string {
    const path = `/settings/integrations/${integrationId}`;

    return projectId == null ? path : `${path}?project=${projectId}`;
}
