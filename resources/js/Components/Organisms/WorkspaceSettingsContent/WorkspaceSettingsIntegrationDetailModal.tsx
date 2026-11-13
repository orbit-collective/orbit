import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useEffect, useState } from 'react';
import Badge from '@/Components/Atoms/Badge/Badge';
import BrandIcon from '@/Components/Atoms/BrandIcon/BrandIcon';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import Modal from '@/Components/Atoms/Modal/Modal';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import EditableMarkdown from '@/Components/Molecules/EditableMarkdown/EditableMarkdown';
import { useIntegrationText } from '@/hooks/useIntegrationText';
import { IntegrationDefinition } from '@/types/Integrations';
import { IssueType } from '@/types/IssueTypes';
import { ProjectLabel } from '@/types/Labels';
import { ProjectPriority } from '@/types/Priorities';
import {
    GithubConnectedRepository,
    GithubConnectStatus,
    ImportIntegrationSettings,
    IntegrationFieldMappingDraft,
    ProjectIntegrationSettings,
} from '@/types/ProjectIntegrations';
import { getCategoryBadgeClassName } from '@/utils/integrationCategoryColors';
import WorkspaceSettingsGithubConnectPanel from './WorkspaceSettingsGithubConnectPanel';
import WorkspaceSettingsImportPanel from './WorkspaceSettingsImportPanel';
import WorkspaceSettingsIntegrationPreview from './WorkspaceSettingsIntegrationPreview';

interface WorkspaceSettingsIntegrationDetailModalProps {
    integration: IntegrationDefinition | null;
    enabled: boolean;
    canUpdate: boolean;
    settings: ProjectIntegrationSettings | null;
    importSettings: ImportIntegrationSettings | null;
    githubStatus: GithubConnectStatus | null;
    issueTypes?: IssueType[];
    labels?: ProjectLabel[];
    priorities?: ProjectPriority[];
    onToggle: (enabled: boolean) => void;
    onSaveWebhookUrl: (webhookUrl: string) => void;
    onToggleOption: (optionId: string, checked: boolean) => void;
    onConnectImport: (credentials: Record<string, string>) => void;
    onSaveImportMappings: (mappings: IntegrationFieldMappingDraft[]) => void;
    onTriggerImport: (projectKey: string, syncExisting: boolean) => void;
    onConnectGithub: () => void;
    onDisconnectGithub: () => void;
    onRetryGithub: () => void;
    onOpenGithubRepositoryPicker?: () => void;
    availableGithubRepositories?: GithubConnectedRepository[] | null;
    isLoadingAvailableGithubRepositories?: boolean;
    onAddGithubRepository?: (repositoryId: number) => void;
    onRemoveGithubRepository?: (repositoryId: number) => void;
    onRefreshGithubRepositories?: () => void;
    isRefreshingGithubRepositories?: boolean;
    onClose: () => void;
}

export default function WorkspaceSettingsIntegrationDetailModal({
    integration,
    enabled,
    canUpdate,
    settings,
    importSettings,
    githubStatus,
    issueTypes = [],
    labels = [],
    priorities = [],
    onToggle,
    onSaveWebhookUrl,
    onToggleOption,
    onConnectImport,
    onSaveImportMappings,
    onTriggerImport,
    onConnectGithub,
    onDisconnectGithub,
    onRetryGithub,
    onOpenGithubRepositoryPicker,
    availableGithubRepositories,
    isLoadingAvailableGithubRepositories,
    onAddGithubRepository,
    onRemoveGithubRepository,
    onRefreshGithubRepositories,
    isRefreshingGithubRepositories,
    onClose,
}: WorkspaceSettingsIntegrationDetailModalProps) {
    const { t } = useLaravelReactI18n();
    const text = useIntegrationText();
    const [webhookUrlDraft, setWebhookUrlDraft] = useState(
        settings?.webhookUrl ?? '',
    );

    useEffect(() => {
        setWebhookUrlDraft(settings?.webhookUrl ?? '');
    }, [integration?.id, settings?.webhookUrl]);

    if (!integration) return null;

    const showConfiguration = !integration.comingSoon;
    const webhookUrlUnchanged =
        webhookUrlDraft === (settings?.webhookUrl ?? '');
    // Import integrations use "active" for the enabled toggle - "Connect"
    // there refers to the panel's own credentials form below, not this toggle.
    const enabledToggleLabel =
        integration.kind === 'import'
            ? enabled
                ? t('workspace_settings_integrations.detail.active')
                : t('workspace_settings_integrations.detail.activate')
            : enabled
              ? t('workspace_settings_integrations.detail.connected')
              : t('workspace_settings_integrations.detail.connect');
    // 'github' has no generic enabled/disabled boolean to toggle from here -
    // connecting/disconnecting is a real GitHub App installation flow, owned
    // entirely by the panel below. The header just reflects that status.
    const githubConnected = githubStatus?.status === 'connected';

    return (
        <Modal isOpen={!!integration} onClose={onClose} size="md">
            <header className="flex items-start justify-between gap-4 border-b border-(--bg-light-color) px-6 py-5">
                <div className="flex items-center gap-3">
                    <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${integration.accentClassName}`}
                    >
                        <BrandIcon
                            name={integration.brand}
                            className="h-5 w-5"
                        />
                    </span>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold text-(--text-color)">
                                {integration.name}
                            </h2>
                            <Badge
                                variant="outline"
                                className={getCategoryBadgeClassName(
                                    integration.category,
                                )}
                            >
                                {t(
                                    `workspace_settings_integrations.categories.${integration.category.toLowerCase().replace(' ', '_')}`,
                                )}
                            </Badge>
                        </div>
                        <p className="text-sm text-(--text-gray-color)">
                            {text.vendor(integration)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={integration.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t(
                            'workspace_settings_integrations.detail.visit_website',
                            {
                                name: integration.name,
                            },
                        )}
                        title={t(
                            'workspace_settings_integrations.detail.visit_website',
                            {
                                name: integration.name,
                            },
                        )}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-(--text-gray-color) transition-colors hover:bg-(--bg-light-color) hover:text-(--text-color)"
                    >
                        <Icon name="ExternalLink" size={16} />
                    </a>
                    {integration.comingSoon ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-(--bg-light-color) px-3 py-1.5 text-sm text-(--text-gray-color)">
                            <Icon name="Lock" size={14} />
                            {t(
                                'workspace_settings_integrations.detail.coming_soon',
                            )}
                        </span>
                    ) : integration.kind === 'github' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-(--bg-light-color) px-3 py-1.5 text-sm text-(--text-gray-color)">
                            <Icon
                                name={
                                    githubConnected ? 'CircleCheck' : 'Circle'
                                }
                                size={14}
                            />
                            {githubConnected
                                ? t(
                                      'workspace_settings_integrations.detail.connected',
                                  )
                                : t(
                                      'workspace_settings_integrations.detail.not_connected',
                                  )}
                        </span>
                    ) : canUpdate ? (
                        <button
                            type="button"
                            onClick={() => onToggle(!enabled)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                enabled
                                    ? 'border border-(--bg-light-color) bg-(--bg-dark-color) text-(--text-color) hover:border-(--border-color-strong)'
                                    : 'bg-(--accent-color) text-white hover:opacity-90'
                            }`}
                        >
                            <Icon
                                name={enabled ? 'CircleCheck' : 'Plug'}
                                size={14}
                            />
                            {enabledToggleLabel}
                        </button>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-(--bg-light-color) px-3 py-1.5 text-sm text-(--text-gray-color)">
                            <Icon
                                name={enabled ? 'CircleCheck' : 'Circle'}
                                size={14}
                            />
                            {integration.kind === 'import'
                                ? enabled
                                    ? t(
                                          'workspace_settings_integrations.detail.active',
                                      )
                                    : t(
                                          'workspace_settings_integrations.detail.not_active',
                                      )
                                : enabled
                                  ? t(
                                        'workspace_settings_integrations.detail.connected',
                                    )
                                  : t(
                                        'workspace_settings_integrations.detail.not_connected',
                                    )}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('common.close')}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-(--text-gray-color) transition-colors hover:bg-(--bg-light-color) hover:text-(--text-color)"
                    >
                        <Icon name="X" size={16} />
                    </button>
                </div>
            </header>

            <div className="overflow-y-auto px-6 py-5">
                <WorkspaceSettingsIntegrationPreview
                    integration={integration}
                />

                <section className="mt-6">
                    <h3 className="text-sm font-semibold text-(--text-color)">
                        {t('workspace_settings_integrations.detail.overview')}
                    </h3>
                    <EditableMarkdown
                        value={text.overview(integration)}
                        onSave={() => {}}
                        disabled
                        className="mt-2"
                    />
                </section>

                {showConfiguration && integration.kind === 'notify' && (
                    <section className="mt-6">
                        <h3 className="text-sm font-semibold text-(--text-color)">
                            {t(
                                'workspace_settings_integrations.detail.webhook_url',
                            )}
                        </h3>
                        {canUpdate ? (
                            <>
                                <p className="mt-1 text-sm text-(--text-gray-color)">
                                    {t(
                                        'workspace_settings_integrations.detail.webhook_hint',
                                        {
                                            name: integration.name,
                                        },
                                    )}
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                    <Input
                                        id="integration-webhook-url"
                                        variant="modal"
                                        type="password"
                                        value={webhookUrlDraft}
                                        onChange={(event) =>
                                            setWebhookUrlDraft(
                                                event.target.value,
                                            )
                                        }
                                        placeholder="https://discord.com/api/webhooks/…"
                                        className="flex-1"
                                    />
                                    <button
                                        type="button"
                                        disabled={webhookUrlUnchanged}
                                        onClick={() =>
                                            onSaveWebhookUrl(webhookUrlDraft)
                                        }
                                        className="shrink-0 rounded-lg bg-(--accent-color) px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {t('common.save')}
                                    </button>
                                </div>
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

                {integration.kind === 'notify' && integration.subOptions && (
                    <section className="mt-6">
                        <h3 className="text-sm font-semibold text-(--text-color)">
                            {t(
                                'workspace_settings_integrations.detail.options',
                            )}
                        </h3>
                        <div className="mt-3 divide-y divide-(--border-color) rounded-xl border border-(--border-color)">
                            {integration.subOptions?.map((option) => (
                                <div
                                    key={option.id}
                                    className="flex items-center justify-between gap-4 px-4 py-3"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-(--text-color)">
                                            {text.optionTitle(
                                                integration,
                                                option,
                                            )}
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
                                            settings?.options[option.id] ??
                                            false
                                        }
                                        onChange={(checked) =>
                                            onToggleOption(option.id, checked)
                                        }
                                        disabled={
                                            integration.comingSoon || !canUpdate
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {showConfiguration && integration.kind === 'import' && (
                    <WorkspaceSettingsImportPanel
                        integration={integration}
                        canUpdate={canUpdate}
                        settings={importSettings}
                        issueTypes={issueTypes}
                        labels={labels}
                        priorities={priorities}
                        onConnect={onConnectImport}
                        onSaveMappings={onSaveImportMappings}
                        onImport={onTriggerImport}
                    />
                )}

                {showConfiguration && integration.kind === 'github' && (
                    <WorkspaceSettingsGithubConnectPanel
                        canUpdate={canUpdate}
                        status={githubStatus}
                        onConnect={onConnectGithub}
                        onDisconnect={onDisconnectGithub}
                        onRetry={onRetryGithub}
                        onOpenRepositoryPicker={onOpenGithubRepositoryPicker}
                        availableRepositories={availableGithubRepositories}
                        isLoadingAvailableRepositories={
                            isLoadingAvailableGithubRepositories
                        }
                        onAddRepository={onAddGithubRepository}
                        onRemoveRepository={onRemoveGithubRepository}
                        onRefreshRepositories={onRefreshGithubRepositories}
                        isRefreshingRepositories={
                            isRefreshingGithubRepositories
                        }
                    />
                )}
            </div>
        </Modal>
    );
}
