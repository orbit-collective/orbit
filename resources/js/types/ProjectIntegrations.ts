import { IntegrationFieldMappingType } from '@/types/Integrations';

export interface ProjectIntegrationSettings {
    enabled: boolean;
    hasWebhookUrl: boolean;
    webhookUrl: string | null;
    options: Record<string, boolean>;
}

export interface IntegrationMappingOption {
    value: string;
    label: string;
}

export interface IntegrationMappingMetadata {
    statuses: IntegrationMappingOption[];
    priorities: IntegrationMappingOption[];
    issueTypes: IntegrationMappingOption[];
}

export interface IntegrationFieldMapping {
    mappingType: IntegrationFieldMappingType;
    externalValue: string;
    externalLabel: string | null;
    orbitValue: string;
}

/**
 * The payload shape the backend's mappings-update endpoint expects
 * (snake_case, matching the request validation). The index signature lets
 * an array of these be sent as Inertia's router.put() body directly.
 */
export interface IntegrationFieldMappingDraft {
    [key: string]: string | null;
    mapping_type: IntegrationFieldMappingType;
    external_value: string;
    external_label: string | null;
    orbit_value: string;
}

export interface IntegrationLastImportResult {
    imported: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: string[];
    ranAt: string;
}

/**
 * Settings-page props for an 'import'-kind integration (see IntegrationKind
 * in Integrations.ts) — parallels ProjectIntegrationSettings, which only
 * covers the webhook_url/options shape 'notify' integrations use.
 */
export interface ImportIntegrationSettings {
    hasCredentials: boolean;
    instanceUrl: string | null;
    mappingMetadata: IntegrationMappingMetadata | null;
    fieldMappings: IntegrationFieldMapping[];
    lastImport: IntegrationLastImportResult | null;
}

export type IntegrationImportRunStatus = 'running' | 'done' | 'failed';

/**
 * The live progress readout polled while an import is running — a separate,
 * cheap prop from ImportIntegrationSettings above (see
 * JiraIntegrationService::getImportProgress()'s docblock for why). `runId`
 * changes every time a new import starts; a poller uses it to tell "this is
 * this run's data" apart from stale data left over from a previous run.
 */
export interface IntegrationImportProgress {
    runId: string | null;
    status: IntegrationImportRunStatus;
    imported: number;
    updated: number;
    skipped: number;
    failed: number;
}
