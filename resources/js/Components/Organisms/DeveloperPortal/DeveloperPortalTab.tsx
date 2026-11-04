import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
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

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => setAll(!allCollapsed)}
                    className="flex items-center gap-1.5 rounded-md border-0 bg-transparent px-2 py-1 text-xs font-medium text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                >
                    <Icon
                        name={
                            allCollapsed ? 'ChevronsUpDown' : 'ChevronsDownUp'
                        }
                        size={14}
                    />
                    {allCollapsed ? 'Expand all' : 'Collapse all'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <StatCard
                    variant="glass"
                    title="Users"
                    value={totals.users}
                    icon="Users"
                    color="info"
                    trend={
                        totals.newUsers > 0
                            ? {
                                  value: totals.newUsers,
                                  label: `new in ${totals.recentDays} days`,
                                  isPositive: true,
                              }
                            : undefined
                    }
                />
                <StatCard
                    variant="glass"
                    title="Projects"
                    value={totals.projects}
                    icon="FolderGit2"
                    color="accent"
                />
                <StatCard
                    variant="glass"
                    title="Issues"
                    value={totals.issues}
                    icon="CircleDot"
                    color="success"
                    trend={
                        totals.newIssues > 0
                            ? {
                                  value: totals.newIssues,
                                  label: `new in ${totals.recentDays} days`,
                                  isPositive: true,
                              }
                            : undefined
                    }
                />
                <StatCard
                    variant="glass"
                    title="Comments"
                    value={totals.comments}
                    icon="MessageSquare"
                    color="warning"
                />
            </div>

            <PercentBarsCard
                {...collapse(
                    'status',
                    `${totals.issues} issues · ${percent(done, totals.issues)}% done`,
                )}
                title="Issues by status"
                icon="ChartColumn"
                totalLabel="Total issues"
                total={String(totals.issues)}
                bars={[
                    {
                        key: 'todo',
                        label: 'To do',
                        percent: percent(todo, totals.issues),
                    },
                    {
                        key: 'in_progress',
                        label: 'In progress',
                        percent: percent(in_progress, totals.issues),
                    },
                    {
                        key: 'done',
                        label: 'Done',
                        percent: percent(done, totals.issues),
                    },
                ]}
                summary={
                    <>
                        <span>
                            To do:{' '}
                            <strong className="text-[var(--text-color)]">
                                {todo}
                            </strong>
                        </span>
                        <span>
                            In progress:{' '}
                            <strong className="text-[var(--text-color)]">
                                {in_progress}
                            </strong>
                        </span>
                        <span>
                            Done:{' '}
                            <strong className="text-[var(--text-color)]">
                                {done}
                            </strong>
                        </span>
                    </>
                }
                footnote={
                    totals.issues > 0
                        ? `${percent(done, totals.issues)}% of all issues are done.`
                        : undefined
                }
            />

            <PortalContainersSection
                containers={containers}
                collapse={collapse}
            />
            <PortalErrorsSection
                errorLog={errorLog}
                queryParams={queryParams}
                collapse={collapse}
            />
            <PortalUsersPanel
                users={portalUsers}
                queryParams={queryParams}
                collapse={collapse}
            />
            <PortalProjectsPanel
                projects={portalProjects}
                queryParams={queryParams}
                collapse={collapse}
            />
        </div>
    );
}
