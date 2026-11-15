import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useEffect, useState } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import Input from '@/Components/Atoms/Input/Input';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import { useIntegrationText } from '@/hooks/useIntegrationText';
import { IntegrationDefinition } from '@/types/Integrations';
import { ProjectIntegrationSettings } from '@/types/ProjectIntegrations';

interface WorkspaceSettingsIntegrationNotifyPanelProps {
    integration: IntegrationDefinition;
    canUpdate: boolean;
    settings: ProjectIntegrationSettings | null;
    onSaveWebhookUrl: (webhookUrl: string) => void;
    onToggleOption: (optionId: string, checked: boolean) => void;
}

/**
 * The configuration of a 'notify' integration (Discord…): the webhook URL
 * activity is posted to, and a switch per kind of activity.
 */
export default function WorkspaceSettingsIntegrationNotifyPanel({
    integration,
    canUpdate,
    settings,
    onSaveWebhookUrl,
    onToggleOption,
}: WorkspaceSettingsIntegrationNotifyPanelProps) {
    const { t } = useLaravelReactI18n();
    const text = useIntegrationText();
    const [webhookUrlDraft, setWebhookUrlDraft] = useState(
        settings?.webhookUrl ?? '',
    );

    useEffect(() => {
        setWebhookUrlDraft(settings?.webhookUrl ?? '');
    }, [integration.id, settings?.webhookUrl]);

    const webhookUrlUnchanged =
        webhookUrlDraft === (settings?.webhookUrl ?? '');
    const webhookLabel = t(
        'workspace_settings_integrations.detail.webhook_url',
    );

    return (
        <>
            {!integration.comingSoon && (
                <section className="mt-6">
                    <h3 className="text-sm font-semibold text-(--text-color)">
                        {webhookLabel}
                    </h3>
                    {canUpdate ? (
                        <>
                            <p className="mt-1 text-sm text-(--text-gray-color)">
                                {t(
                                    'workspace_settings_integrations.detail.webhook_hint',
                                    { name: integration.name },
                                )}
                            </p>
                            <form
                                className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"
                                onSubmit={(event) => {
                                    event.preventDefault();

                                    if (!webhookUrlUnchanged) {
                                        onSaveWebhookUrl(webhookUrlDraft);
                                    }
                                }}
                            >
                                {/* The Input has no focus style of its own; the ring is drawn around it. */}
                                <div className="flex-1 rounded-md focus-within:ring-2 focus-within:ring-(--accent-color) focus-within:ring-offset-2 focus-within:ring-offset-(--bg-color-hover)">
                                    <Input
                                        id="integration-webhook-url"
                                        aria-label={webhookLabel}
                                        variant="modal"
                                        type="password"
                                        value={webhookUrlDraft}
                                        onChange={(event) =>
                                            setWebhookUrlDraft(
                                                event.target.value,
                                            )
                                        }
                                        placeholder="https://discord.com/api/webhooks/…"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    isDisabled={webhookUrlUnchanged}
                                    className="shrink-0 px-4 py-2"
                                >
                                    {t('common.save')}
                                </Button>
                            </form>
                        </>
                    ) : (
                        <p className="mt-1 text-sm text-(--text-gray-color)">
                            {settings?.hasWebhookUrl
                                ? t(
                                      'workspace_settings_integrations.detail.webhook_configured',
                                  )
                                : t(
                                      'workspace_settings_integrations.detail.webhook_missing',
                                  )}
                        </p>
                    )}
                </section>
            )}

            {integration.subOptions && (
                <section className="mt-6">
                    <h3 className="text-sm font-semibold text-(--text-color)">
                        {t('workspace_settings_integrations.detail.options')}
                    </h3>
                    <div className="mt-3 divide-y divide-(--border-color) rounded-xl border border-(--border-color)">
                        {integration.subOptions.map((option) => (
                            <div
                                key={option.id}
                                className="flex items-center justify-between gap-4 px-4 py-3"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-(--text-color)">
                                        {text.optionTitle(integration, option)}
                                    </p>
                                    <p className="mt-0.5 text-sm text-(--text-gray-color)">
                                        {text.optionDescription(
                                            integration,
                                            option,
                                        )}
                                    </p>
                                </div>
                                <ToggleSwitch
                                    checked={
                                        settings?.options[option.id] ?? false
                                    }
                                    onChange={(checked) =>
                                        onToggleOption(option.id, checked)
                                    }
                                    disabled={
                                        integration.comingSoon || !canUpdate
                                    }
                                    label={text.optionTitle(
                                        integration,
                                        option,
                                    )}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}
