import { Link } from '@inertiajs/react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import { PageSection, PageStage } from '@/Components/Atoms/PageStage/PageStage';
import Reveal from '@/Components/Atoms/Reveal/Reveal';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import EmptyStateCard from '@/Components/Molecules/EmptyStateCard/EmptyStateCard';
import Pagination from '@/Components/Molecules/Pagination/Pagination';
import ProjectCard from '@/Components/Molecules/ProjectCard/ProjectCard';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import ActivityLogs from '@/Components/Organisms/ActivityLogs/ActivityLogs';
import DashboardVisuals from '@/Components/Organisms/DashboardVisuals/DashboardVisuals';
import PageHeader from '@/Components/Organisms/PageHeader/PageHeader';
import Sidebar from '@/Components/Organisms/Sidebar/Sidebar';
import { useCommandPalette } from '@/context/CommandContext';
import { useDashboardLive } from '@/live/useDashboardLive';
import { ActivityLogEntry } from '@/types/ActivityLog';
import {
    IssueStats,
    PaginatedResponse,
    ProductivityTrendProps,
} from '@/types/Issues';
import { IssueType } from '@/types/IssueTypes';
import { Project } from '@/types/Projects';
import { AssignableUser } from '@/types/Users';
import {
    ACTIVITY_PAGE_PARAM,
    ACTIVITY_PER_PAGE_PARAM,
} from '@/utils/activityLog';
import { requestOpenCommandPalette } from '@/utils/commandPaletteEvent';
import Icon from '@/Components/Atoms/Icon/Icon';

const ACTIVITY_DEFAULT_PER_PAGE = 10;

export default function Dashboard({
    issueStats,
    projects,
    productivity_trend,
    activityLogs,
    queryParams = {},
    users = [],
    issueTypes = [],
}: {
    issueStats: IssueStats;
    projects: Project[];
    productivity_trend: ProductivityTrendProps[];
    activityLogs: PaginatedResponse<ActivityLogEntry>;
    queryParams?: Record<string, any> | null;
    users?: AssignableUser[];
    issueTypes?: IssueType[];
}) {
    const done = issueStats.category.done;
    const stats = {
        open: issueStats.total - done,
        topPriority: issueStats.topPriority,
        resolutionRate:
            issueStats.total > 0
                ? Math.round((done / issueStats.total) * 100)
                : 0,
    };

    const hasProjects = projects && projects.length > 0;
    const { runCommand } = useCommandPalette();

    // Counters, trend and feed follow changes in any of the user's projects.
    useDashboardLive((projects ?? []).map((project) => project.id));

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-color)]">
            <Sidebar projects={projects} />
            <div className="m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[var(--bg-color-hover)]">
                <PageHeader
                    title="Dashboard"
                    icon="LayoutDashboard"
                    primaryAction={{
                        label: 'New Project',
                        icon: 'Plus',
                        onClick: () => runCommand('project.create'),
                    }}
                    children={
                        <button
                            type="button"
                            aria-label="Open dashboard editor"
                            title="Open dashboard editor"
                            className="flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1.5 hover:bg-[var(--bg-light-color)]"
                        >
                            <Icon
                                name="PenLine"
                                size={18}
                                color="var(--text-gray-color)"
                            />
                        </button>
                    }
                />
                <div className="relative flex flex-1 overflow-hidden">
                    <PageStage
                        as="main"
                        className="flex flex-1 flex-col gap-6 overflow-y-auto p-6"
                    >
                        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            <PageSection className="h-full">
                                <StatCard
                                    className="h-full"
                                    title="Active Projects"
                                    value={
                                        <AnimatedNumber
                                            value={projects.length}
                                        />
                                    }
                                    icon="FolderGit2"
                                    description="Tracked projects in workspace"
                                    color="accent"
                                />
                            </PageSection>
                            <PageSection className="h-full">
                                <StatCard
                                    className="h-full"
                                    title="Open Issues"
                                    value={
                                        <AnimatedNumber value={stats.open} />
                                    }
                                    icon="Layers"
                                    description="Active tasks assigned/open"
                                    color="info"
                                />
                            </PageSection>
                            <PageSection className="h-full">
                                <StatCard
                                    className="h-full"
                                    title="Critical Tasks"
                                    value={
                                        <AnimatedNumber
                                            value={stats.topPriority}
                                        />
                                    }
                                    icon="TriangleAlert"
                                    description="Issues at the top of their priority scale"
                                    color="error"
                                />
                            </PageSection>
                            <PageSection className="h-full">
                                <StatCard
                                    className="h-full"
                                    title="Resolution Rate"
                                    value={
                                        <AnimatedNumber
                                            value={stats.resolutionRate}
                                            format={(n) => `${Math.round(n)}%`}
                                        />
                                    }
                                    icon="CircleCheck"
                                    progress={stats.resolutionRate}
                                    color="success"
                                />
                            </PageSection>
                        </section>

                        <DashboardVisuals
                            stats={issueStats}
                            productivity_trend={productivity_trend}
                        />

                        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            <PageSection className="flex lg:col-span-2">
                                <div className="flex max-h-[min(720px,80vh)] min-h-[400px] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)] p-4">
                                    <div className="mb-2">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                                            Recent Work Activity
                                        </h3>
                                    </div>
                                    <div
                                        key={activityLogs.current_page}
                                        className="flex-1 overflow-y-auto"
                                    >
                                        <ActivityLogs
                                            logs={activityLogs.data}
                                            users={users}
                                            issueTypes={issueTypes}
                                        />
                                    </div>
                                    <Pagination
                                        links={activityLogs.links}
                                        from={activityLogs.from}
                                        to={activityLogs.to}
                                        total={activityLogs.total}
                                        queryParams={queryParams ?? {}}
                                        pageParam={ACTIVITY_PAGE_PARAM}
                                        perPageParam={ACTIVITY_PER_PAGE_PARAM}
                                        defaultPerPage={
                                            ACTIVITY_DEFAULT_PER_PAGE
                                        }
                                        preserveState
                                        className="border-t border-solid border-[var(--border-color)] px-0 pb-0"
                                    />
                                </div>
                            </PageSection>

                            <PageSection className="flex">
                                <div className="flex flex-1 flex-col gap-4 rounded-xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)] p-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                                            Projects Directory
                                        </h3>
                                        <span className="text-[10px] font-medium text-[var(--text-muted-color)]">
                                            Showing{' '}
                                            {projects.slice(0, 3).length} latest
                                            projects
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        {hasProjects ? (
                                            <>
                                                {projects
                                                    .slice(0, 3)
                                                    .map((project, index) => (
                                                        <RowReveal
                                                            key={project.id}
                                                            index={index}
                                                        >
                                                            <ProjectCard
                                                                project={
                                                                    project
                                                                }
                                                            />
                                                        </RowReveal>
                                                    ))}
                                                {projects.length > 3 && (
                                                    <Link
                                                        href="/projects"
                                                        className="cursor-pointer rounded-lg border border-dashed border-[var(--bg-light-color)] py-2.5 text-center text-xs font-semibold text-[var(--text-muted-color)] transition-colors hover:text-[var(--text-color)]"
                                                    >
                                                        View all{' '}
                                                        {projects.length}{' '}
                                                        projects
                                                    </Link>
                                                )}
                                            </>
                                        ) : (
                                            <Reveal>
                                                <EmptyStateCard
                                                    title={
                                                        'Create your first project'
                                                    }
                                                    description={
                                                        'Get started by setting up a workspace for your tasks and team activity.'
                                                    }
                                                    iconName={'FolderPlus'}
                                                    actionLabel={
                                                        'Create Project'
                                                    }
                                                    actionCommand={
                                                        'project.create'
                                                    }
                                                />
                                            </Reveal>
                                        )}
                                    </div>
                                </div>
                            </PageSection>
                        </section>
                    </PageStage>
                </div>
            </div>
        </div>
    );
}
