import { usePage } from '@inertiajs/react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useMemo } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import Badge from '@/Components/Atoms/Badge/Badge';
import Icon from '@/Components/Atoms/Icon/Icon';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import PercentBarsCard from '@/Components/Molecules/PercentBarsCard/PercentBarsCard';
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
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';
import { DURATION, EASE, riseIn, staggerParent } from '@/utils/motion';
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
        { key: 'todo', label: 'To do', count: todo },
        { key: 'in_progress', label: 'In progress', count: in_progress },
        { key: 'done', label: 'Done', count: done },
    ] as const;

    const stat = (
        title: string,
        value: number,
        icon: 'Users' | 'FolderGit2' | 'CircleDot' | 'MessageSquare',
        color: 'info' | 'accent' | 'success' | 'warning',
        fresh?: number,
    ) => (
        <motion.div variants={riseIn}>
            <StatCard
                variant="glass"
                title={title}
                value={<AnimatedNumber value={value} />}
                icon={icon}
                color={color}
                trend={
                    fresh && fresh > 0
                        ? {
                              value: fresh,
                              label: `new in ${totals.recentDays} days`,
                              isPositive: true,
                          }
                        : undefined
                }
            />
        </motion.div>
    );

    return (
        <MotionConfig reducedMotion="user">
            <motion.div
                variants={staggerParent}
                initial="hidden"
                animate="show"
                className="space-y-6"
            >
                <motion.div variants={riseIn} className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => setAll(!allCollapsed)}
                        className={cn(
                            'flex cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent px-2 py-1 text-xs font-medium text-[var(--text-gray-color)] transition-colors duration-200 hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]',
                            FOCUS_RING,
                        )}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                                key={allCollapsed ? 'expand' : 'collapse'}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{
                                    duration: DURATION.fast,
                                    ease: EASE,
                                }}
                                className="flex items-center gap-1.5"
                            >
                                <Icon
                                    name={
                                        allCollapsed
                                            ? 'ChevronsUpDown'
                                            : 'ChevronsDownUp'
                                    }
                                    size={14}
                                />
                                {allCollapsed ? 'Expand all' : 'Collapse all'}
                            </motion.span>
                        </AnimatePresence>
                    </button>
                </motion.div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {stat(
                        'Users',
                        totals.users,
                        'Users',
                        'info',
                        totals.newUsers,
                    )}
                    {stat('Projects', totals.projects, 'FolderGit2', 'accent')}
                    {stat(
                        'Issues',
                        totals.issues,
                        'CircleDot',
                        'success',
                        totals.newIssues,
                    )}
                    {stat(
                        'Comments',
                        totals.comments,
                        'MessageSquare',
                        'warning',
                    )}
                </div>

                <motion.div variants={riseIn}>
                    <PercentBarsCard
                        {...collapse(
                            'status',
                            `${totals.issues} issues · ${percent(done, totals.issues)}% done`,
                        )}
                        title="Issues by status"
                        icon="ChartColumn"
                        totalLabel="Total issues"
                        total={<AnimatedNumber value={totals.issues} />}
                        bars={statuses.map(({ key, label, count }) => ({
                            key,
                            label,
                            percent: percent(count, totals.issues),
                            tooltip: `${count} ${label.toLowerCase()} · ${percent(count, totals.issues)}% of all issues`,
                        }))}
                        summary={statuses.map(({ key, label, count }) => (
                            <Badge
                                key={key}
                                color={key}
                                tabIndex={0}
                                tooltip
                                tooltipText={`${percent(count, totals.issues)}% of all issues`}
                                className={cn(
                                    'gap-1.5 px-2.5 py-1 text-xs',
                                    FOCUS_RING,
                                )}
                            >
                                <StatusDot status={key} size="xs" />
                                {label}
                                <strong>
                                    <AnimatedNumber value={count} />
                                </strong>
                            </Badge>
                        ))}
                        footnote={
                            totals.issues > 0
                                ? `${percent(done, totals.issues)}% of all issues are done.`
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
        </MotionConfig>
    );
}
