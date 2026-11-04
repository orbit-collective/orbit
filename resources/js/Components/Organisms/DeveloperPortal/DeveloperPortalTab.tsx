import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import PercentBarsCard from '@/Components/Molecules/PercentBarsCard/PercentBarsCard';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <StatCard
                    variant="vivid"
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
                    variant="vivid"
                    title="Projects"
                    value={totals.projects}
                    icon="FolderGit2"
                    color="accent"
                />
                <StatCard
                    variant="vivid"
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
                    variant="vivid"
                    title="Comments"
                    value={totals.comments}
                    icon="MessageSquare"
                    color="warning"
                />
            </div>

            <PercentBarsCard
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
                footnote={
                    totals.issues > 0
                        ? `${percent(done, totals.issues)}% of all issues are done.`
                        : undefined
                }
            />

            <PortalContainersSection containers={containers} />
            <PortalErrorsSection errorLog={errorLog} />
            <PortalUsersPanel users={portalUsers} queryParams={queryParams} />
            <PortalProjectsPanel
                projects={portalProjects}
                queryParams={queryParams}
            />
        </div>
    );
}
