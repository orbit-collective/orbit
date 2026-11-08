import { Link } from '@inertiajs/react';
import { FC } from 'react';
import Reveal from '@/Components/Atoms/Reveal/Reveal';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import EmptyStateCard from '@/Components/Molecules/EmptyStateCard/EmptyStateCard';
import ProjectCard from '@/Components/Molecules/ProjectCard/ProjectCard';
import { useElementWidth } from '@/hooks/useElementWidth';
import { Project } from '@/types/Projects';
import { cn } from '@/utils/cn';
import { getColorTheme } from '@/utils/colors';

export const DEFAULT_PROJECTS_SHOWN = 3;

type ProjectsSort = 'latest' | 'name' | 'progress' | 'issues';

interface ProjectsDirectoryPanelProps {
    projects: Project[];
    /** `cards` shows the full project cards, `grid` small tiles side by side, `compact` one line per project. */
    variant?: string;
    limit?: number;
    /** `latest` keeps the order the server sent. */
    sort?: ProjectsSort;
    showHeader?: boolean;
    showViewAll?: boolean;
}

const totalOf = (project: Project) => {
    const counts = project.issue_counts;

    return counts ? counts.todo + counts.in_progress + counts.done : 0;
};

const progressOf = (project: Project) => {
    const total = totalOf(project);

    return total === 0 ? 0 : (project.issue_counts?.done ?? 0) / total;
};

/** How many tiles of the grid style fit next to each other in a width. */
const tileColumns = (width: number) =>
    width >= 560 ? 3 : width >= 360 ? 2 : 1;

const SORTERS: Record<ProjectsSort, (a: Project, b: Project) => number> = {
    latest: () => 0,
    name: (a, b) => a.name.localeCompare(b.name),
    progress: (a, b) => progressOf(b) - progressOf(a),
    issues: (a, b) => totalOf(b) - totalOf(a),
};

/** The "Projects Directory" of the dashboard: a few of the user's projects. */
const ProjectsDirectoryPanel: FC<ProjectsDirectoryPanelProps> = ({
    projects,
    variant = 'cards',
    limit = DEFAULT_PROJECTS_SHOWN,
    sort = 'latest',
    showHeader = true,
    showViewAll = true,
}) => {
    const ordered = [...projects].sort(SORTERS[sort] ?? SORTERS.latest);
    const shown = ordered.slice(0, limit);
    const [listRef, listWidth] = useElementWidth<HTMLDivElement>();

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)] p-4">
            {showHeader && (
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                        Projects Directory
                    </h3>
                    <span className="text-[10px] font-medium text-[var(--text-muted-color)]">
                        Showing {shown.length}{' '}
                        {sort === 'latest' ? 'latest projects' : 'projects'}
                    </span>
                </div>
            )}
            <div
                ref={listRef}
                className={cn(
                    'grid',
                    variant === 'cards' && 'gap-4',
                    variant === 'grid' && 'gap-3',
                    variant === 'compact' && 'gap-1',
                )}
                style={{
                    gridTemplateColumns: `repeat(${variant === 'grid' ? tileColumns(listWidth) : 1}, minmax(0, 1fr))`,
                }}
            >
                {shown.length > 0 ? (
                    <>
                        {shown.map((project, index) => (
                            <RowReveal key={project.id} index={index}>
                                {variant === 'compact' ? (
                                    <CompactProjectRow project={project} />
                                ) : variant === 'grid' ? (
                                    <ProjectTile project={project} />
                                ) : (
                                    <ProjectCard project={project} />
                                )}
                            </RowReveal>
                        ))}
                        {showViewAll && projects.length > limit && (
                            <Link
                                href="/projects"
                                className="col-span-full cursor-pointer rounded-lg border border-dashed border-[var(--bg-light-color)] py-2.5 text-center text-xs font-semibold text-[var(--text-muted-color)] transition-colors hover:text-[var(--text-color)]"
                            >
                                View all {projects.length} projects
                            </Link>
                        )}
                    </>
                ) : (
                    <Reveal>
                        <EmptyStateCard
                            title="Create your first project"
                            description="Get started by setting up a workspace for your tasks and team activity."
                            iconName="FolderPlus"
                            actionLabel="Create Project"
                            actionCommand="project.create"
                        />
                    </Reveal>
                )}
            </div>
        </div>
    );
};

const CompactProjectRow: FC<{ project: Project }> = ({ project }) => {
    const theme = getColorTheme(project.color);

    return (
        <Link
            href={`/projects/${project.id}`}
            className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-[var(--text-color)] no-underline transition-colors hover:bg-[var(--bg-light-color)]"
        >
            <span className="flex min-w-0 items-center gap-2">
                <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-sm ${theme.accent}`}
                />
                <span className="truncate text-sm font-medium">
                    {project.name}
                </span>
            </span>
            <span className="shrink-0 text-[11px] font-medium text-[var(--text-muted-color)]">
                {totalOf(project)} issues
            </span>
        </Link>
    );
};

/** A small tile for the `grid` variant: the project, its issues and progress. */
const ProjectTile: FC<{ project: Project }> = ({ project }) => {
    const theme = getColorTheme(project.color);
    const total = totalOf(project);
    const pct = Math.round(progressOf(project) * 100);

    return (
        <Link
            href={`/projects/${project.id}`}
            className="flex flex-col gap-3 rounded-xl border border-solid border-[var(--border-color)] bg-[var(--bg-color-hover)] p-3 text-[var(--text-color)] no-underline transition-colors hover:border-[var(--border-color-strong)] hover:bg-[var(--bg-light-color-hover)]"
        >
            <span className="flex min-w-0 items-center gap-2">
                <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 shrink-0 rounded-sm ${theme.accent}`}
                />
                <span className="truncate text-sm font-semibold">
                    {project.name}
                </span>
            </span>
            <span className="flex items-center justify-between text-[11px] text-[var(--text-muted-color)]">
                <span>{total} issues</span>
                <span className="font-semibold tabular-nums">{pct}%</span>
            </span>
            <span className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-light-color)]">
                <span
                    data-testid="project-tile-progress"
                    className={`block h-full rounded-full ${theme.accent}`}
                    style={{ width: `${pct}%` }}
                />
            </span>
        </Link>
    );
};

export default ProjectsDirectoryPanel;
