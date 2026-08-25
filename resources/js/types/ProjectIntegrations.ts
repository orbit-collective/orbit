export interface ProjectIntegrationSettings {
    enabled: boolean;
    hasWebhookUrl: boolean;
    webhookUrl: string | null;
    options: Record<string, boolean>;
}
