import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { useAlert } from '@/context/AlertContext';
import {
    INTEGRATION_CATEGORIES,
    IntegrationCategory,
    IntegrationId,
    INTEGRATIONS,
} from '@/types/Integrations';
import {
    ImportIntegrationSettings,
    IntegrationFieldMappingDraft,
    IntegrationImportProgress,
    ProjectIntegrationSettings,
} from '@/types/ProjectIntegrations';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { cn } from '@/utils/cn';
import { router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
    hasIntegrationsAccess?: boolean;
    canUpdateIntegrations?: boolean;
}

/** integration id -> its import-flow route names, for import-kind integrations that are actually wired up. */
const IMPORT_ROUTE_NAMES: Partial<
    Record<IntegrationId, { connect: string; mappings: string; import: string }>
> = {
    jira: {
        connect: 'projects.integrations.jira.connect',
        mappings: 'projects.integrations.jira.mappings.update',
        import: 'projects.integrations.jira.import',
    },
};

/** How often the "Importing…" toast polls jiraImportProgress while a run is in flight. */
const IMPORT_POLL_INTERVAL_MS = 1500;

function describeImportCounts(progress: {
    imported: number;
    updated: number;
    skipped: number;
    failed: number;
}): string {
    const parts = [`${progress.imported} imported`];

    if (progress.updated) parts.push(`${progress.updated} updated`);
    if (progress.skipped) parts.push(`${progress.skipped} skipped`);
    if (progress.failed) parts.push(`${progress.failed} failed`);

    return parts.join(', ');
}

export default function WorkspaceSettingsIntegrationsTab({
    memberProjects = [],
    selectedProjectId = null,
    integrationStatuses = {},
    integrationSettings = {},
    jiraSettings = null,
    jiraImportProgress = null,
    hasIntegrationsAccess = false,
    canUpdateIntegrations = false,
}: WorkspaceSettingsIntegrationsTabProps) {
    const { addAlert, updateAlert, removeAlert } = useAlert();
    const [openIntegrationId, setOpenIntegrationId] =
        useState<IntegrationId | null>(null);
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');

    // Tracks the live "Importing…" toast across poll ticks: which alert to
    // update, the interval driving the polling, and the runId the progress
    // record had right before this import was triggered (so a poll that
    // still sees the *previous* run's leftover 'done'/'failed' state - the
    // job hasn't picked up the new one up yet - is correctly ignored
    // instead of closing the toast prematurely).
    const importAlertIdRef = useRef<string | null>(null);
    const importPollTimerRef = useRef<ReturnType<typeof setInterval> | null>(
        null,
    );
    const importBaselineRunIdRef = useRef<string | null>(null);

    const stopImportPolling = () => {
        if (importPollTimerRef.current !== null) {
            clearInterval(importPollTimerRef.current);
            importPollTimerRef.current = null;
        }
    };

    useEffect(() => stopImportPolling, []);

    useEffect(() => {
        const alertId = importAlertIdRef.current;

        if (!alertId || !jiraImportProgress) return;
        if (jiraImportProgress.runId === importBaselineRunIdRef.current) {
            return;
        }

        if (jiraImportProgress.status === 'running') {
            updateAlert(alertId, {
                message: `Importing… ${describeImportCounts(jiraImportProgress)}`,
            });

            return;
        }

        stopImportPolling();
        importAlertIdRef.current = null;
        removeAlert(alertId);

        if (jiraImportProgress.status === 'done') {
            addAlert(
                `Import done — ${describeImportCounts(jiraImportProgress)}.`,
                jiraImportProgress.failed > 0 ? 'warning' : 'success',
                6000,
            );
        } else {
            addAlert(
                'Import failed — check your notifications for details.',
                'error',
                6000,
            );
        }
    }, [jiraImportProgress, addAlert, removeAlert, updateAlert]);

    const selectedProject =
        memberProjects.find((project) => project.id === selectedProjectId) ??
        null;

    const switchProject = (projectId: number) => {
        router.get(
            `/settings?tab=integrations&project=${projectId}`,
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

    const toggleIntegration = (
        integrationId: IntegrationId,
        checked: boolean,
    ) => {
        if (!selectedProject) return;

        router.patch(
            route('projects.integrations.update', [
                selectedProject.id,
                integrationId,
            ]),
            { enabled: checked },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    addAlert(
                        `${checked ? 'Enabled' : 'Disabled'} the ${integrationId} integration.`,
                        'success',
                    );
                },
                onError: () => {
                    addAlert('Failed to update the integration.', 'error');
                },
            },
        );
    };

    const saveIntegrationSettings = (
        integrationId: IntegrationId,
        data: { webhook_url?: string; options?: Record<string, boolean> },
    ) => {
        if (!selectedProject) return;

        router.patch(
            route('projects.integrations.settings.update', [
                selectedProject.id,
                integrationId,
            ]),
            data,
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    addAlert('Integration settings updated.', 'success');
                },
                onError: () => {
                    addAlert(
                        'Failed to update the integration settings.',
                        'error',
                    );
                },
            },
        );
    };

    const connectImportIntegration = (
        integrationId: IntegrationId,
        credentials: Record<string, string>,
    ) => {
        const routeNames = IMPORT_ROUTE_NAMES[integrationId];

        if (!selectedProject || !routeNames) return;

        router.post(
            route(routeNames.connect, [selectedProject.id]),
            credentials,
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    addAlert(`Connected to ${integrationId}.`, 'success');
                },
                onError: () => {
                    addAlert(`Failed to connect to ${integrationId}.`, 'error');
                },
            },
        );
    };

    const saveImportMappings = (
        integrationId: IntegrationId,
        mappings: IntegrationFieldMappingDraft[],
    ) => {
        const routeNames = IMPORT_ROUTE_NAMES[integrationId];

        if (!selectedProject || !routeNames) return;

        router.put(
            route(routeNames.mappings, [selectedProject.id]),
            { mappings },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    addAlert('Field mappings updated.', 'success');
                },
                onError: () => {
                    addAlert('Failed to update field mappings.', 'error');
                },
            },
        );
    };

    const triggerImport = (
        integrationId: IntegrationId,
        projectKey: string,
        syncExisting: boolean,
    ) => {
        const routeNames = IMPORT_ROUTE_NAMES[integrationId];

        if (!selectedProject || !routeNames) return;

        router.post(
            route(routeNames.import, [selectedProject.id]),
            { project_key: projectKey, sync_existing: syncExisting },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    // Only Jira reports live progress today (jiraImportProgress
                    // is a Jira-specific prop) - other import integrations
                    // still get the plain "started" toast until they get
                    // their own progress prop wired the same way.
                    if (integrationId !== 'jira') {
                        addAlert(
                            'Import started — this can take a few minutes.',
                            'success',
                        );

                        return;
                    }

                    stopImportPolling();
                    importBaselineRunIdRef.current =
                        jiraImportProgress?.runId ?? null;
                    importAlertIdRef.current = addAlert(
                        'Importing… 0 imported',
                        'information',
                        0,
                    );

                    importPollTimerRef.current = setInterval(() => {
                        router.reload({ only: ['jiraImportProgress'] });
                    }, IMPORT_POLL_INTERVAL_MS);
                },
                onError: () => {
                    addAlert('Failed to start the import.', 'error');
                },
            },
        );
    };

    if (!selectedProject || !hasIntegrationsAccess) {
        return (
            <SettingsPanel
                title="Integrations"
                description="Connect third-party tools to bring activity from Orbit into the apps your team already uses."
                icon="Plug"
            >
                <SettingsPanelRow
                    title={
                        !selectedProject
                            ? "You're not part of any project yet"
                            : "You don't have access to this project's integrations"
                    }
                    description={
                        !selectedProject
                            ? 'Create or join a project to manage its integrations here.'
                            : 'Ask a project admin for the integrations.view permission to see integrations here.'
                    }
                />
            </SettingsPanel>
        );
    }

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-xl font-semibold text-[var(--text-color)]">
                    Your integrations
                </h2>
                <p className="mt-1 text-sm text-[var(--text-gray-color)]">
                    Connect third-party tools to bring activity from Orbit into
                    the apps your team already uses.
                </p>
            </div>

            <ProjectPickerPanel
                projects={memberProjects}
                selectedProjectId={selectedProject.id}
                description="Choose which project's integrations to manage."
                onSelect={switchProject}
            />

            {!canUpdateIntegrations && (
                <SettingsPanel
                    title="Read-only access"
                    description="You can see how integrations are configured, but you don't have permission to change them."
                    icon="Eye"
                >
                    <SettingsPanelRow
                        title="Ask a project admin"
                        description="Only members with the integrations.update permission can enable or disable integrations."
                    />
                </SettingsPanel>
            )}

            <div className="flex flex-wrap gap-2">
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
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-[var(--accent-color)] text-white'
                                    : 'bg-[var(--bg-light-color)] text-[var(--text-gray-color)] hover:text-[var(--text-color)]',
                            )}
                        >
                            {category}
                            <span
                                className={cn(
                                    'text-xs',
                                    isActive
                                        ? 'text-white/70'
                                        : 'text-[var(--text-muted-color)]',
                                )}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {filteredIntegrations.map((integration) => (
                    <WorkspaceSettingsIntegrationCard
                        key={integration.id}
                        integration={integration}
                        enabled={integrationStatuses[integration.id] ?? false}
                        canUpdate={canUpdateIntegrations}
                        onToggle={(checked) =>
                            toggleIntegration(integration.id, checked)
                        }
                        onOpen={() => setOpenIntegrationId(integration.id)}
                    />
                ))}
            </div>

            <WorkspaceSettingsIntegrationDetailModal
                integration={openIntegration}
                enabled={
                    openIntegration
                        ? (integrationStatuses[openIntegration.id] ?? false)
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
                onClose={() => setOpenIntegrationId(null)}
            />
        </div>
    );
}
