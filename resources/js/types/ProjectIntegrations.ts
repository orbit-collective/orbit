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

export interface IntegrationLastImportResult {
    imported: number;
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
