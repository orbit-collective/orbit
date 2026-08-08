import EmptyStateCard from '@/Components/Molecules/EmptyStateCard/EmptyStateCard';
import ProjectCard from '@/Components/Molecules/ProjectCard/ProjectCard';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import DashboardVisuals from '@/Components/Organisms/DashboardVisuals/DashboardVisuals';
import IssueTable from '@/Components/Organisms/IssueTable/IssueTable';
import PageHeader from '@/Components/Organisms/PageHeader/PageHeader';
import Sidebar from '@/Components/Organisms/Sidebar/Sidebar';
import { Issue, ProductivityTrendProps } from '@/types/Issues';
import { Project } from '@/types/Projects';
import { Link } from '@inertiajs/react';
import { useMemo } from 'react';

export default function Dashboard({
    issues,
    projects,
    productivity_trend,
}: {
    issues: Issue[];
    projects: Project[];
    productivity_trend: ProductivityTrendProps[];
}) {
    const stats = useMemo(() => {
        const total = issues.length;
        const closed = issues.filter((i) => i.status === 'closed').length;
        const open = total - closed;
        const highPriority = issues.filter((i) => i.priority === 'high').length;
        const resolutionRate =
            total > 0 ? Math.round((closed / total) * 100) : 0;

        return {
            total,
            open,
            highPriority,
            resolutionRate,
        };
    }, [issues]);

    const hasProjects = projects && projects.length > 0;

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-color)]">
            <Sidebar projects={projects} />
            <div className="flex min-w-0 flex-1 flex-col">
                <PageHeader title="Dashboard" />
                <div className="relative flex flex-1 overflow-hidden">
                    <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
                        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            <StatCard
                                title="Active Projects"
                                value={projects.length}
                                icon="FolderGit2"
                                description="Tracked projects in workspace"
                                color="accent"
                            />
                            <StatCard
                                title="Open Issues"
                                value={stats.open}
                                icon="Layers"
                                description="Active tasks assigned/open"
                                color="info"
                            />
                            <StatCard
                                title="Critical Tasks"
                                value={stats.highPriority}
                                icon="TriangleAlert"
                                description="High priority issues needing attention"
                                color="error"
                            />
                            <StatCard
                                title="Resolution Rate"
                                value={`${stats.resolutionRate}%`}
                                icon="CircleCheck"
                                progress={stats.resolutionRate}
                                color="success"
                            />
                        </section>

                        <DashboardVisuals
                            issues={issues}
                            productivity_trend={productivity_trend}
                        />

                        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            <div className="flex min-h-[400px] flex-col lg:col-span-2">
                                <div className="mb-2 flex items-center justify-between">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                                        Recent Work Activity
                                    </h3>
                                    <span className="text-[10px] font-medium text-[var(--text-muted-color)]">
                                        Showing {issues.slice(0, 20).length}{' '}
                                        latest issues
                                    </span>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    <IssueTable issues={issues.slice(0, 20)} />
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                                        Projects Directory
                                    </h3>
                                    <span className="text-[10px] font-medium text-[var(--text-muted-color)]">
                                        Showing {projects.slice(0, 3).length}{' '}
                                        latest projects
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {hasProjects ? (
                                        <>
                                            {projects
                                                .slice(0, 3)
                                                .map((project) => (
                                                    <ProjectCard
                                                        key={project.id}
                                                        project={project}
                                                        issues={issues}
                                                    />
                                                ))}
                                            {projects.length > 3 && (
                                                <Link
                                                    href="/projects"
                                                    className="cursor-pointer rounded-lg border border-dashed border-[var(--bg-light-color)] py-2.5 text-center text-xs font-semibold text-[var(--text-muted-color)] transition-colors hover:text-[var(--text-color)]"
                                                >
                                                    View all {projects.length}{' '}
                                                    projects
                                                </Link>
                                            )}
                                        </>
                                    ) : (
                                        <EmptyStateCard
                                            title={'Create your first project'}
                                            description={
                                                'Get started by setting up a workspace for your tasks and team activity.'
                                            }
                                            iconName={'FolderPlus'}
                                            actionLabel={'Create Project'}
                                            actionShortcut={'p'}
                                        />
                                    )}
                                </div>
                            </div>
                        </section>
                    </main>
                </div>
            </div>
        </div>
    );
}
