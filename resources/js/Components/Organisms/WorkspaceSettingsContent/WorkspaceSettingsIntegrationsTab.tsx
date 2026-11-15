import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useMemo, useRef, useState } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import SegmentedControl from '@/Components/Atoms/SegmentedControl/SegmentedControl';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { useIntegrationActions } from '@/hooks/useIntegrationActions';
import { useIntegrationListCommands } from '@/hooks/useIntegrationCommands';
import { useIntegrationText } from '@/hooks/useIntegrationText';
import {
    INTEGRATION_CATEGORIES,
    IntegrationCategory,
    IntegrationDefinition,
    INTEGRATIONS,
} from '@/types/Integrations';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';
import {
    INTEGRATION_STATE_FILTERS,
    IntegrationStateFilter,
    integrationState,
    matchesSearch,
} from '@/utils/integrationFilters';
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
    const { t, tChoice } = useLaravelReactI18n();
    const { toggleIntegration } = useIntegrationActions({
        projectId: selectedProjectId,
    });
    const text = useIntegrationText();
    const searchRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [activeState, setActiveState] =
        useState<IntegrationStateFilter>('all');
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
    useIntegrationListCommands({
        projectId: selectedProjectId,
        canUpdate: hasIntegrationsAccess && canUpdateIntegrations,
        statuses: integrationStatuses,
        onToggle: toggleIntegration,
        onSearch: () => searchRef.current?.focus(),
    });

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

    // What the search words are matched against: the name, the vendor, the
    // description and the category, all as the user reads them.
    const searchable = useMemo(
        () =>
            INTEGRATIONS.map((integration) => ({
                integration,
                text: [
                    integration.name,
                    text.vendor(integration),
                    text.description(integration),
                    t(
                        `workspace_settings_integrations.categories.${integration.category.toLowerCase().replace(' ', '_')}`,
                    ),
                ].join(' '),
            })),
        [t, text],
    );
    const stateOf = (integration: IntegrationDefinition) =>
        integrationState(
            integration,
            integration.id === 'github'
                ? (integrationStatuses.github ?? false)
                : (integrationStatuses[integration.id] ?? false),
        );
    // The search and the category narrow the list first; the state counts are
    // taken on that, so each count is what choosing it would show.
    const inSearchAndCategory = searchable
        .filter(
            ({ integration, text: haystack }) =>
                (activeCategory === 'All' ||
                    integration.category === activeCategory) &&
                matchesSearch(haystack, query),
        )
        .map(({ integration }) => integration);
    const filteredIntegrations = inSearchAndCategory.filter(
        (integration) =>
            activeState === 'all' || stateOf(integration) === activeState,
    );
    const stateCount = (state: IntegrationStateFilter) =>
        state === 'all'
            ? inSearchAndCategory.length
            : inSearchAndCategory.filter(
                  (integration) => stateOf(integration) === state,
              ).length;
    const hasFilters =
        query.trim() !== '' ||
        activeState !== 'all' ||
        activeCategory !== 'All';
    const resetFilters = () => {
        setQuery('');
        setActiveState('all');
        setActiveCategory('All');
    };

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

            <motion.div
                variants={riseIn}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
                <div className="relative w-full sm:max-w-xs">
                    <Icon
                        name="Search"
                        size={14}
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-(--text-gray-color)"
                    />
                    {/* The Input has no focus style of its own; the ring is drawn around it. */}
                    <div className="rounded-md focus-within:ring-2 focus-within:ring-(--accent-color) focus-within:ring-offset-2 focus-within:ring-offset-(--bg-color-hover)">
                        <Input
                            ref={searchRef}
                            type="search"
                            aria-label={t(
                                'workspace_settings_integrations.tab.search_label',
                            )}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape' && query !== '') {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setQuery('');
                                }
                            }}
                            placeholder={t(
                                'workspace_settings_integrations.tab.search_placeholder',
                            )}
                            autoComplete="off"
                            className="pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
                        />
                    </div>
                    {query !== '' && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('');
                                searchRef.current?.focus();
                            }}
                            aria-label={t(
                                'workspace_settings_integrations.tab.clear_search',
                            )}
                            className={cn(
                                'absolute top-1/2 right-2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-sm text-(--text-gray-color) hover:text-(--text-color)',
                                FOCUS_RING,
                            )}
                        >
                            <Icon name="X" size={12} />
                        </button>
                    )}
                </div>

                <SegmentedControl
                    label={t(
                        'workspace_settings_integrations.tab.filter_by_state',
                    )}
                    value={activeState}
                    onChange={setActiveState}
                    options={INTEGRATION_STATE_FILTERS.map((state) => ({
                        value: state,
                        label: `${t(`workspace_settings_integrations.tab.states.${state}`)} ${stateCount(state)}`,
                    }))}
                />
            </motion.div>

            <motion.div
                variants={riseIn}
                role="group"
                aria-label={t(
                    'workspace_settings_integrations.tab.filter_by_category',
                )}
                className="flex flex-wrap gap-2"
            >
                {CATEGORY_FILTERS.map((category) => {
                    const isActive = category === activeCategory;
                    const count = searchable.filter(
                        ({ integration, text: haystack }) =>
                            (category === 'All' ||
                                integration.category === category) &&
                            matchesSearch(haystack, query) &&
                            (activeState === 'all' ||
                                stateOf(integration) === activeState),
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

            <div role="status" aria-live="polite" className="sr-only">
                {tChoice(
                    'workspace_settings_integrations.tab.results',
                    filteredIntegrations.length,
                )}
            </div>

            {filteredIntegrations.length === 0 && (
                <SettingsPanel
                    title={t('workspace_settings_integrations.tab.no_results')}
                    description={t(
                        'workspace_settings_integrations.tab.no_results_hint',
                    )}
                    icon="Search"
                >
                    <SettingsPanelRow
                        title={t(
                            'workspace_settings_integrations.tab.no_results_title',
                        )}
                        action={
                            hasFilters && (
                                <Button
                                    type="button"
                                    onClick={resetFilters}
                                    className="px-3 py-1.5"
                                >
                                    {t(
                                        'workspace_settings_integrations.tab.clear_filters',
                                    )}
                                </Button>
                            )
                        }
                    />
                </SettingsPanel>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {filteredIntegrations.map((integration, index) => (
                    <RowReveal key={integration.id} index={index} fill>
                        <WorkspaceSettingsIntegrationCard
                            integration={integration}
                            enabled={
                                integrationStatuses[integration.id] ?? false
                            }
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
