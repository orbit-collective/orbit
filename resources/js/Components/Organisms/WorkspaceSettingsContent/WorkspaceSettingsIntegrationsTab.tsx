import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useEffect, useMemo, useRef, useState } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { useAlert } from '@/context/AlertContext';
import { useIntegrationActions } from '@/hooks/useIntegrationActions';
import {
    INTEGRATION_CATEGORIES,
    IntegrationCategory,
    IntegrationId,
    INTEGRATIONS,
} from '@/types/Integrations';
import { IssueType } from '@/types/IssueTypes';
import { ProjectLabel } from '@/types/Labels';
import { ProjectPriority } from '@/types/Priorities';
import {
    GithubConnectedRepository,
    GithubConnectStatus,
    ImportIntegrationSettings,
    IntegrationFieldMappingDraft,
    IntegrationImportProgress,
    ProjectIntegrationSettings,
} from '@/types/ProjectIntegrations';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';
import { SPRING, riseIn } from '@/utils/motion';
import WorkspaceSettingsIntegrationCard from './WorkspaceSettingsIntegrationCard';
import WorkspaceSettingsIntegrationDetailModal from './WorkspaceSettingsIntegrationDetailModal';

type CategoryFilter = IntegrationCategory | 'All';

const CATEGORY_FILTERS: CategoryFilter[] = ['All', ...INTEGRATION_CATEGORIES];

interface WorkspaceSettingsIntegrationsTabProps {
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    integrationStatuses?: Record<string, boolean>;
    integrationSettings?: Record<string, ProjectIntegrationSettings>;
    jiraSettings?: ImportIntegrationSettings | null;
    jiraImportProgress?: IntegrationImportProgress | null;
    githubConnectStatus?: GithubConnectStatus | null;
    issueTypes?: IssueType[];
    labels?: ProjectLabel[];
    priorities?: ProjectPriority[];
    hasIntegrationsAccess?: boolean;
    canUpdateIntegrations?: boolean;
}

export default function WorkspaceSettingsIntegrationsTab({
    memberProjects = [],
    selectedProjectId = null,
    integrationStatuses = {},
    integrationSettings = {},
    jiraSettings = null,
    jiraImportProgress = null,
    githubConnectStatus = null,
    issueTypes = [],
    labels = [],
    priorities = [],
    hasIntegrationsAccess = false,
    canUpdateIntegrations = false,
}: WorkspaceSettingsIntegrationsTabProps) {
    const { t } = useLaravelReactI18n();
    const {
        toggleIntegration,
        saveIntegrationSettings,
        connectImportIntegration,
        saveImportMappings,
        triggerImport,
        connectGithub,
        disconnectGithub,
        retryGithub,
        availableGithubRepositories,
        isLoadingAvailableGithubRepositories,
        openGithubRepositoryPicker,
        addGithubRepository,
        removeGithubRepository,
        refreshGithubRepositories,
        isRefreshingGithubRepositories,
    } = useIntegrationActions({
        projectId: selectedProjectId,
        jiraImportProgress,
        githubConnectStatus,
    });
    const [openIntegrationId, setOpenIntegrationId] =
        useState<IntegrationId | null>(null);
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');

    const selectedProject =
        memberProjects.find((project) => project.id === selectedProjectId) ??
        null;

    const switchProject = (projectId: number) => {
        router.get(
            `/settings/integrations?project=${projectId}`,
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

    const openIntegration =
        INTEGRATIONS.find(
            (integration) => integration.id === openIntegrationId,
        ) ?? null;

    const filteredIntegrations = useMemo(
        () =>
            activeCategory === 'All'
                ? INTEGRATIONS
                : INTEGRATIONS.filter(
                      (integration) => integration.category === activeCategory,
                  ),
        [activeCategory],
    );

    if (!selectedProject || !hasIntegrationsAccess) {
        return (
            <SettingsPanel
                id="integrations"
                title={t('workspace_settings_integrations.tab.title')}
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

    return (
        <div className="space-y-5">
            <motion.div variants={riseIn}>
                <h2 className="text-xl font-semibold text-(--text-color)">
                    {t('workspace_settings_integrations.tab.heading')}
                </h2>
                <p className="mt-1 text-sm text-(--text-gray-color)">
                    {t('workspace_settings_integrations.tab.description')}
                </p>
            </motion.div>

            <ProjectPickerPanel
                projects={memberProjects}
                selectedProjectId={selectedProject.id}
                description={t(
                    'workspace_settings_integrations.tab.pick_project',
                )}
                onSelect={switchProject}
            />

            {!canUpdateIntegrations && (
                <SettingsPanel
                    id="read-only"
                    title={t('workspace_settings_integrations.tab.read_only')}
                    description={t(
                        'workspace_settings_integrations.tab.read_only_description',
                    )}
                    icon="Eye"
                >
                    <SettingsPanelRow
                        title={t(
                            'workspace_settings_integrations.tab.ask_admin',
                        )}
                        description={t(
                            'workspace_settings_integrations.tab.ask_admin_description',
                        )}
                    />
                </SettingsPanel>
            )}

            <motion.div variants={riseIn} className="flex flex-wrap gap-2">
                {CATEGORY_FILTERS.map((category) => {
                    const isActive = category === activeCategory;
                    const count =
                        category === 'All'
                            ? INTEGRATIONS.length
                            : INTEGRATIONS.filter(
                                  (integration) =>
                                      integration.category === category,
                              ).length;

                    return (
                        <button
                            key={category}
                            type="button"
                            onClick={() => setActiveCategory(category)}
                            aria-pressed={isActive}
                            className={cn(
                                'relative inline-flex items-center gap-1.5 rounded-full border-0 px-3.5 py-1.5 text-sm font-medium transition-colors duration-200',
                                FOCUS_RING,
                                isActive
                                    ? 'text-white'
                                    : 'bg-(--bg-light-color) text-(--text-gray-color) hover:text-(--text-color)',
                            )}
                        >
                            {isActive && (
                                <motion.span
                                    layoutId="integration-category"
                                    transition={SPRING}
                                    aria-hidden="true"
                                    className="absolute inset-0 rounded-full bg-(--accent-color)"
                                />
                            )}
                            <span className="relative">
                                {category === 'All'
                                    ? t('common.all')
                                    : t(
                                          `workspace_settings_integrations.categories.${category.toLowerCase().replace(' ', '_')}`,
                                      )}
                            </span>
                            <span
                                className={cn(
                                    'relative text-xs',
                                    isActive
                                        ? 'text-white/70'
                                        : 'text-(--text-muted-color)',
                                )}
                            >
                                <AnimatedNumber value={count} />
                            </span>
                        </button>
                    );
                })}
            </motion.div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {filteredIntegrations.map((integration, index) => (
                    <RowReveal key={integration.id} index={index} fill>
                        <WorkspaceSettingsIntegrationCard
                            integration={integration}
                            enabled={
                                integration.id === 'github'
                                    ? githubConnectStatus?.status ===
                                      'connected'
                                    : (integrationStatuses[integration.id] ??
                                      false)
                            }
                            canUpdate={canUpdateIntegrations}
                            onToggle={(checked) =>
                                integration.id === 'github'
                                    ? checked
                                        ? connectGithub()
                                        : disconnectGithub()
                                    : toggleIntegration(integration.id, checked)
                            }
                            onOpen={() => setOpenIntegrationId(integration.id)}
                        />
                    </RowReveal>
                ))}
            </div>

            <WorkspaceSettingsIntegrationDetailModal
                integration={openIntegration}
                enabled={
                    openIntegration
                        ? openIntegration.id === 'github'
                            ? githubConnectStatus?.status === 'connected'
                            : (integrationStatuses[openIntegration.id] ?? false)
                        : false
                }
                canUpdate={canUpdateIntegrations}
                settings={
                    openIntegration
                        ? (integrationSettings[openIntegration.id] ?? null)
                        : null
                }
                importSettings={
                    openIntegration?.id === 'jira' ? jiraSettings : null
                }
                githubStatus={
                    openIntegration?.id === 'github'
                        ? githubConnectStatus
                        : null
                }
                issueTypes={issueTypes}
                labels={labels}
                priorities={priorities}
                onToggle={(checked) => {
                    if (!openIntegration) return;

                    toggleIntegration(openIntegration.id, checked);
                }}
                onSaveWebhookUrl={(webhookUrl) => {
                    if (!openIntegration) return;

                    saveIntegrationSettings(openIntegration.id, {
                        webhook_url: webhookUrl,
                    });
                }}
                onToggleOption={(optionId, checked) => {
                    if (!openIntegration) return;

                    saveIntegrationSettings(openIntegration.id, {
                        options: { [optionId]: checked },
                    });
                }}
                onConnectImport={(credentials) => {
                    if (!openIntegration) return;

                    connectImportIntegration(openIntegration.id, credentials);
                }}
                onSaveImportMappings={(mappings) => {
                    if (!openIntegration) return;

                    saveImportMappings(openIntegration.id, mappings);
                }}
                onTriggerImport={(projectKey, syncExisting) => {
                    if (!openIntegration) return;

                    triggerImport(openIntegration.id, projectKey, syncExisting);
                }}
                onConnectGithub={connectGithub}
                onDisconnectGithub={disconnectGithub}
                onRetryGithub={retryGithub}
                onOpenGithubRepositoryPicker={openGithubRepositoryPicker}
                availableGithubRepositories={availableGithubRepositories}
                isLoadingAvailableGithubRepositories={
                    isLoadingAvailableGithubRepositories
                }
                onAddGithubRepository={addGithubRepository}
                onRemoveGithubRepository={removeGithubRepository}
                onRefreshGithubRepositories={refreshGithubRepositories}
                isRefreshingGithubRepositories={isRefreshingGithubRepositories}
                onClose={() => setOpenIntegrationId(null)}
            />
        </div>
    );
}
