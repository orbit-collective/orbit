import { usePage } from '@inertiajs/react';
import { MotionConfig, motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useMemo } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import WorkflowStatusBadge from '@/Components/Atoms/WorkflowStatusBadge/WorkflowStatusBadge';
import CollapseAllButton from '@/Components/Molecules/CollapseAllButton/CollapseAllButton';
import PercentBarsCard from '@/Components/Molecules/PercentBarsCard/PercentBarsCard';
import { PanelRiseContext } from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import { useCollapsedSections } from '@/hooks/useCollapsedSections';
import { useDeveloperPortalLive } from '@/live/useDeveloperPortalLive';
import {
    Paginated,
    PortalContainers,
    PortalErrorLog,
    PortalProject,
    PortalTotals,
    PortalUser,
} from '@/types/DeveloperPortal';
import { riseIn, staggerParent } from '@/utils/motion';
import PortalContainersSection from './PortalContainersSection';
import PortalErrorsSection from './PortalErrorsSection';
import PortalProjectsPanel from './PortalProjectsPanel';
import PortalUsersPanel from './PortalUsersPanel';

interface DeveloperPortalTabProps {
    totals: PortalTotals;
    portalUsers: Paginated<PortalUser>;
    portalProjects: Paginated<PortalProject>;
    containers?: PortalContainers;
    errorLog?: PortalErrorLog;
}

/** First-visit state: the glanceable parts open, the long lists folded. */
export const SECTION_DEFAULTS = {
    status: false,
    uptime: false,
    containers: false,
    activity: false,
    errors: false,
    users: true,
    projects: true,
};

/** The same colours StatusDot gives the three status categories. */
const STATUS_COLORS = {
    todo: 'var(--info-color)',
    in_progress: 'var(--accent-color)',
    done: 'var(--pending-color)',
} as const;

const SECTIONS_STORAGE_KEY = 'developer-portal-sections';

const percent = (part: number, whole: number) =>
    whole === 0 ? 0 : Math.round((part / whole) * 100);

export default function DeveloperPortalTab({
    totals,
    portalUsers,
    portalProjects,
    containers,
    errorLog,
}: DeveloperPortalTabProps) {
    const { t } = useLaravelReactI18n();
    useDeveloperPortalLive();
    const { collapse, setAll, allCollapsed } = useCollapsedSections(
        SECTIONS_STORAGE_KEY,
        SECTION_DEFAULTS,
    );

    const { url } = usePage();
    const queryParams = useMemo(
        () =>
            Object.fromEntries(
                new URLSearchParams(url.split('?')[1] ?? '').entries(),
            ),
        [url],
    );

    const { todo, in_progress, done } = totals.categories;

    const statuses = [
        {
            key: 'todo',
            label: t('developer_portal.tab.status.todo'),
            count: todo,
        },
        {
            key: 'in_progress',
            label: t('developer_portal.tab.status.in_progress'),
            count: in_progress,
        },
        {
            key: 'done',
            label: t('developer_portal.tab.status.done'),
            count: done,
        },
    ] as const;

    const stat = (
        title: string,
        value: number,
        icon: 'Users' | 'FolderGit2' | 'CircleDot' | 'MessageSquare',
        color: 'info' | 'accent' | 'success' | 'warning',
        fresh?: number,
    ) => (
        <motion.div variants={riseIn} className="h-full">
            <StatCard
                className="h-full"
                variant="default"
                title={title}
                value={<AnimatedNumber value={value} />}
                icon={icon}
                color={color}
                trend={
                    fresh && fresh > 0
                        ? {
                              value: fresh,
                              label: t('developer_portal.tab.new_in_days', {
                                  days: totals.recentDays,
                              }),
                              isPositive: true,
                          }
                        : undefined
                }
            />
        </motion.div>
    );

    return (
        <MotionConfig reducedMotion="user">
            <PanelRiseContext.Provider value={false}>
                <motion.div
                    variants={staggerParent}
                    initial="hidden"
                    animate="show"
                    className="space-y-6"
                >
                    <motion.div variants={riseIn} className="flex justify-end">
                        <CollapseAllButton
                            allCollapsed={allCollapsed}
                            onToggle={() => setAll(!allCollapsed)}
                        />
                    </motion.div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {stat(
                            t('developer_portal.tab.stats.users'),
                            totals.users,
                            'Users',
                            'info',
                            totals.newUsers,
                        )}
                        {stat(
                            t('developer_portal.tab.stats.projects'),
                            totals.projects,
                            'FolderGit2',
                            'accent',
                        )}
                        {stat(
                            t('developer_portal.tab.stats.issues'),
                            totals.issues,
                            'CircleDot',
                            'success',
                            totals.newIssues,
                        )}
                        {stat(
                            t('developer_portal.tab.stats.comments'),
                            totals.comments,
                            'MessageSquare',
                            'warning',
                        )}
                    </div>

                    <motion.div variants={riseIn}>
                        <PercentBarsCard
                            {...collapse(
                                'status',
                                t('developer_portal.tab.summary', {
                                    issues: totals.issues,
                                    percent: percent(done, totals.issues),
                                }),
                            )}
                            title={t('developer_portal.tab.by_status')}
                            icon="ChartColumn"
                            totalLabel={t('developer_portal.tab.total_issues')}
                            total={<AnimatedNumber value={totals.issues} />}
                            bars={statuses.map(({ key, label, count }) => ({
                                key,
                                label,
                                percent: percent(count, totals.issues),
                                tooltip: t('developer_portal.tab.bar_tooltip', {
                                    count,
                                    label: label.toLowerCase(),
                                    percent: percent(count, totals.issues),
                                }),
                            }))}
                            summary={statuses.map(({ key, label, count }) => (
                                <WorkflowStatusBadge
                                    key={key}
                                    status={{
                                        name: label,
                                        color: STATUS_COLORS[key],
                                    }}
                                    suffix={<AnimatedNumber value={count} />}
                                    tooltip={t(
                                        'developer_portal.tab.badge_tooltip',
                                        {
                                            percent: percent(
                                                count,
                                                totals.issues,
                                            ),
                                        },
                                    )}
                                    className="px-2.5 py-1"
                                />
                            ))}
                            footnote={
                                totals.issues > 0
                                    ? t('developer_portal.tab.footnote', {
                                          percent: percent(done, totals.issues),
                                      })
                                    : undefined
                            }
                        />
                    </motion.div>

                    <motion.div variants={riseIn}>
                        <PortalContainersSection
                            containers={containers}
                            collapse={collapse}
                        />
                    </motion.div>
                    <motion.div variants={riseIn}>
                        <PortalErrorsSection
                            errorLog={errorLog}
                            queryParams={queryParams}
                            collapse={collapse}
                        />
                    </motion.div>
                    <motion.div variants={riseIn}>
                        <PortalUsersPanel
                            users={portalUsers}
                            queryParams={queryParams}
                            collapse={collapse}
                        />
                    </motion.div>
                    <motion.div variants={riseIn}>
                        <PortalProjectsPanel
                            projects={portalProjects}
                            queryParams={queryParams}
                            collapse={collapse}
                        />
                    </motion.div>
                </motion.div>
            </PanelRiseContext.Provider>
        </MotionConfig>
    );
}
