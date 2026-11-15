import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useMemo, useState } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { useIntegrationActions } from '@/hooks/useIntegrationActions';
import {
    INTEGRATION_CATEGORIES,
    IntegrationCategory,
    INTEGRATIONS,
} from '@/types/Integrations';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';
import { integrationPath, integrationsPath } from '@/utils/integrationPaths';
import { SPRING, riseIn } from '@/utils/motion';
import WorkspaceSettingsIntegrationCard from './WorkspaceSettingsIntegrationCard';

type CategoryFilter = IntegrationCategory | 'All';

const CATEGORY_FILTERS: CategoryFilter[] = ['All', ...INTEGRATION_CATEGORIES];

interface WorkspaceSettingsIntegrationsTabProps {
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    integrationStatuses?: Record<string, boolean>;
    hasIntegrationsAccess?: boolean;
    canUpdateIntegrations?: boolean;
}

/**
 * The integrations overview: a grid of cards, each linking to the
 * integration's own page. It only knows the enabled states, so it stays
 * light however much an integration's page has to load.
 */
export default function WorkspaceSettingsIntegrationsTab({
    memberProjects = [],
    selectedProjectId = null,
    integrationStatuses = {},
    hasIntegrationsAccess = false,
    canUpdateIntegrations = false,
}: WorkspaceSettingsIntegrationsTabProps) {
    const { t } = useLaravelReactI18n();
    const { toggleIntegration } = useIntegrationActions({
        projectId: selectedProjectId,
    });
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');

    const selectedProject =
        memberProjects.find((project) => project.id === selectedProjectId) ??
        null;

    const switchProject = (projectId: number) => {
        router.get(
            integrationsPath(projectId),
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

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
                            enabled={integrationStatuses[integration.id] ?? false}
                            canUpdate={canUpdateIntegrations}
                            href={integrationPath(
                                integration.id,
                                selectedProject.id,
                            )}
                            onToggle={
                                integration.id === 'github'
                                    ? undefined
                                    : (checked) =>
                                          toggleIntegration(
                                              integration.id,
                                              checked,
                                          )
                            }
                        />
                    </RowReveal>
                ))}
            </div>

        </div>
    );
}
