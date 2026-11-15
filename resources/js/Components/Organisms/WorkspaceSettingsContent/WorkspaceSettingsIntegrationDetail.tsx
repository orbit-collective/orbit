import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import Badge from '@/Components/Atoms/Badge/Badge';
import Icon from '@/Components/Atoms/Icon/Icon';
import DetailsTable from '@/Components/Molecules/DetailsTable/DetailsTable';
import EditableMarkdown from '@/Components/Molecules/EditableMarkdown/EditableMarkdown';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { useIntegrationActions } from '@/hooks/useIntegrationActions';
import { useIntegrationText } from '@/hooks/useIntegrationText';
import { IntegrationDefinition } from '@/types/Integrations';
import { IssueType } from '@/types/IssueTypes';
import { ProjectLabel } from '@/types/Labels';
import { ProjectPriority } from '@/types/Priorities';
import {
    GithubConnectStatus,
    ImportIntegrationSettings,
    IntegrationImportProgress,
    ProjectIntegrationSettings,
} from '@/types/ProjectIntegrations';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { getCategoryBadgeClassName } from '@/utils/integrationCategoryColors';
import { integrationPath } from '@/utils/integrationPaths';
import { riseIn } from '@/utils/motion';
import WorkspaceSettingsGithubConnectPanel from './WorkspaceSettingsGithubConnectPanel';
import WorkspaceSettingsImportPanel from './WorkspaceSettingsImportPanel';
import WorkspaceSettingsIntegrationHero from './WorkspaceSettingsIntegrationHero';
import WorkspaceSettingsIntegrationNotifyPanel from './WorkspaceSettingsIntegrationNotifyPanel';
import WorkspaceSettingsIntegrationPreview from './WorkspaceSettingsIntegrationPreview';

interface WorkspaceSettingsIntegrationDetailProps {
    integration: IntegrationDefinition;
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    enabled?: boolean;
    settings?: ProjectIntegrationSettings | null;
    jiraSettings?: ImportIntegrationSettings | null;
    jiraImportProgress?: IntegrationImportProgress | null;
    githubConnectStatus?: GithubConnectStatus | null;
    issueTypes?: IssueType[];
    labels?: ProjectLabel[];
    priorities?: ProjectPriority[];
    hasIntegrationsAccess?: boolean;
    canUpdateIntegrations?: boolean;
}

/**
 * The body of one integration's page (`/settings/integrations/{id}`): the
 * hero, a preview, the facts about it, what it does and - for an
 * integration that is wired up - its configuration. It carries only the
 * data of this integration, loaded by the page's own route.
 */
export default function WorkspaceSettingsIntegrationDetail({
    integration,
    memberProjects = [],
    selectedProjectId = null,
    enabled = false,
    settings = null,
    jiraSettings = null,
    jiraImportProgress = null,
    githubConnectStatus = null,
    issueTypes = [],
    labels = [],
    priorities = [],
    hasIntegrationsAccess = false,
    canUpdateIntegrations = false,
}: WorkspaceSettingsIntegrationDetailProps) {
    const { t } = useLaravelReactI18n();
    const text = useIntegrationText();
    const actions = useIntegrationActions({
        projectId: selectedProjectId,
        jiraImportProgress,
        githubConnectStatus,
    });
    const selectedProject =
        memberProjects.find((project) => project.id === selectedProjectId) ??
        null;
    const isGithub = integration.kind === 'github';

    if (!selectedProject || !hasIntegrationsAccess) {
        return (
            <SettingsPanel
                id="integration"
                title={integration.name}
                description={t(
                    'workspace_settings_integrations.tab.description',
                )}
                icon="Plug"
            >
                <SettingsPanelRow
                    title={
                        !selectedProject
                            ? t(
                                  'workspace_settings_integrations.tab.no_project',
                              )
                            : t('workspace_settings_integrations.tab.no_access')
                    }
                    description={
                        !selectedProject
                            ? t(
                                  'workspace_settings_integrations.tab.no_project_hint',
                              )
                            : t(
                                  'workspace_settings_integrations.tab.no_access_hint',
                              )
                    }
                />
            </SettingsPanel>
        );
    }

    const showConfiguration = !integration.comingSoon;

    return (
        <div className="space-y-10">
            <ProjectPickerPanel
                projects={memberProjects}
                selectedProjectId={selectedProject.id}
                description={t(
                    'workspace_settings_integrations.tab.pick_project',
                )}
                onSelect={(projectId) =>
                    router.get(
                        integrationPath(integration.id, projectId),
                        {},
                        { preserveScroll: true, preserveState: true },
                    )
                }
            />

            <motion.div variants={riseIn} className="space-y-3">
                <WorkspaceSettingsIntegrationHero
                    integration={integration}
                    enabled={enabled}
                    canUpdate={canUpdateIntegrations}
                    onToggle={
                        isGithub
                            ? undefined
                            : (checked) =>
                                  actions.toggleIntegration(
                                      integration.id,
                                      checked,
                                  )
                    }
                />
                {!canUpdateIntegrations && !integration.comingSoon && (
                    <p className="flex items-center gap-2 text-sm text-(--text-muted-color)">
                        <Icon name="Eye" size={14} />
                        {t('workspace_settings_integrations.detail.read_only')}
                    </p>
                )}
            </motion.div>

            <motion.div
                variants={riseIn}
                className="rounded-3xl border border-(--border-color) bg-linear-to-br from-(--accent-color-opacity) via-(--bg-light-color) to-transparent p-4 sm:p-8"
            >
                <div className="mx-auto max-w-xl">
                    <WorkspaceSettingsIntegrationPreview
                        integration={integration}
                    />
                </div>
            </motion.div>

            <motion.section
                variants={riseIn}
                aria-labelledby="integration-details"
            >
                <h2
                    id="integration-details"
                    className="mb-3 text-lg font-semibold text-(--text-color)"
                >
                    {t('workspace_settings_integrations.detail.details')}
                </h2>
                <DetailsTable
                    rows={[
                        {
                            icon: 'Building',
                            label: t(
                                'workspace_settings_integrations.detail.vendor',
                            ),
                            value: text.vendor(integration),
                        },
                        {
                            icon: 'Tag',
                            label: t(
                                'workspace_settings_integrations.detail.category',
                            ),
                            value: (
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
                            ),
                        },
                        {
                            icon: 'Shapes',
                            label: t(
                                'workspace_settings_integrations.detail.type',
                            ),
                            value: t(
                                `workspace_settings_integrations.detail.kinds.${integration.kind}`,
                            ),
                        },
                        {
                            icon: enabled ? 'CircleCheck' : 'Circle',
                            label: t(
                                'workspace_settings_integrations.detail.status',
                            ),
                            value: text.status(integration, enabled),
                        },
                        {
                            icon: 'Globe',
                            label: t(
                                'workspace_settings_integrations.detail.website',
                            ),
                            value: (
                                <a
                                    href={integration.websiteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-sm text-(--accent-color) outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-(--accent-color)"
                                >
                                    {integration.websiteUrl.replace(
                                        /^https?:\/\//,
                                        '',
                                    )}
                                </a>
                            ),
                        },
                    ]}
                />
            </motion.section>

            <motion.section
                variants={riseIn}
                aria-labelledby="integration-overview"
            >
                <h2
                    id="integration-overview"
                    className="text-lg font-semibold text-(--text-color)"
                >
                    {t('workspace_settings_integrations.detail.overview')}
                </h2>
                <EditableMarkdown
                    value={text.overview(integration)}
                    onSave={() => {}}
                    disabled
                    className="mt-2"
                />
            </motion.section>

            <motion.section
                variants={riseIn}
                aria-labelledby="integration-configuration"
            >
                <h2
                    id="integration-configuration"
                    className="text-lg font-semibold text-(--text-color)"
                >
                    {t('workspace_settings_integrations.detail.configuration')}
                </h2>

                {!showConfiguration && (
                    <p className="mt-2 text-sm text-(--text-gray-color)">
                        {t(
                            'workspace_settings_integrations.detail.coming_soon_note',
                        )}
                    </p>
                )}

                {integration.kind === 'notify' && (
                    <WorkspaceSettingsIntegrationNotifyPanel
                        integration={integration}
                        canUpdate={canUpdateIntegrations}
                        settings={settings}
                        onSaveWebhookUrl={(webhookUrl) =>
                            actions.saveIntegrationSettings(integration.id, {
                                webhook_url: webhookUrl,
                            })
                        }
                        onToggleOption={(optionId, checked) =>
                            actions.saveIntegrationSettings(integration.id, {
                                options: { [optionId]: checked },
                            })
                        }
                    />
                )}

                {showConfiguration && integration.kind === 'import' && (
                    <WorkspaceSettingsImportPanel
                        integration={integration}
                        canUpdate={canUpdateIntegrations}
                        settings={jiraSettings}
                        issueTypes={issueTypes}
                        labels={labels}
                        priorities={priorities}
                        onConnect={(credentials) =>
                            actions.connectImportIntegration(
                                integration.id,
                                credentials,
                            )
                        }
                        onSaveMappings={(mappings) =>
                            actions.saveImportMappings(integration.id, mappings)
                        }
                        onImport={(projectKey, syncExisting) =>
                            actions.triggerImport(
                                integration.id,
                                projectKey,
                                syncExisting,
                            )
                        }
                    />
                )}

                {showConfiguration && isGithub && (
                    <WorkspaceSettingsGithubConnectPanel
                        canUpdate={canUpdateIntegrations}
                        status={githubConnectStatus}
                        onConnect={actions.connectGithub}
                        onDisconnect={actions.disconnectGithub}
                        onRetry={actions.retryGithub}
                        onOpenRepositoryPicker={
                            actions.openGithubRepositoryPicker
                        }
                        availableRepositories={
                            actions.availableGithubRepositories
                        }
                        isLoadingAvailableRepositories={
                            actions.isLoadingAvailableGithubRepositories
                        }
                        onAddRepository={actions.addGithubRepository}
                        onRemoveRepository={actions.removeGithubRepository}
                        onRefreshRepositories={
                            actions.refreshGithubRepositories
                        }
                        isRefreshingRepositories={
                            actions.isRefreshingGithubRepositories
                        }
                    />
                )}
            </motion.section>
        </div>
    );
}
