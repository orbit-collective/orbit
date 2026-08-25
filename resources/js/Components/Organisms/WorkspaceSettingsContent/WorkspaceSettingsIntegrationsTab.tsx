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
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { cn } from '@/utils/cn';
import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import WorkspaceSettingsIntegrationCard from './WorkspaceSettingsIntegrationCard';
import WorkspaceSettingsIntegrationDetailModal from './WorkspaceSettingsIntegrationDetailModal';

type CategoryFilter = IntegrationCategory | 'All';

const CATEGORY_FILTERS: CategoryFilter[] = ['All', ...INTEGRATION_CATEGORIES];

interface WorkspaceSettingsIntegrationsTabProps {
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    integrationStatuses?: Record<string, boolean>;
    hasIntegrationsAccess?: boolean;
    canUpdateIntegrations?: boolean;
}

export default function WorkspaceSettingsIntegrationsTab({
    memberProjects = [],
    selectedProjectId = null,
    integrationStatuses = {},
    hasIntegrationsAccess = false,
    canUpdateIntegrations = false,
}: WorkspaceSettingsIntegrationsTabProps) {
    const { addAlert } = useAlert();
    const [openIntegrationId, setOpenIntegrationId] =
        useState<IntegrationId | null>(null);
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');

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
                onToggle={(checked) => {
                    if (!openIntegration) return;

                    toggleIntegration(openIntegration.id, checked);
                }}
                onClose={() => setOpenIntegrationId(null)}
            />
        </div>
    );
}
