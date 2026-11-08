import { Link } from '@inertiajs/react';
import { FC } from 'react';
import Reveal from '@/Components/Atoms/Reveal/Reveal';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import EmptyStateCard from '@/Components/Molecules/EmptyStateCard/EmptyStateCard';
import ProjectCard from '@/Components/Molecules/ProjectCard/ProjectCard';
import { Project } from '@/types/Projects';
import { getColorTheme } from '@/utils/colors';

export const DEFAULT_PROJECTS_SHOWN = 3;

interface ProjectsDirectoryPanelProps {
    projects: Project[];
    /** `cards` shows the full project cards, `compact` one line per project. */
    variant?: string;
    limit?: number;
}

/** The "Projects Directory" of the dashboard: the latest projects. */
const ProjectsDirectoryPanel: FC<ProjectsDirectoryPanelProps> = ({
    projects,
    variant = 'cards',
    limit = DEFAULT_PROJECTS_SHOWN,
}) => {
    const shown = projects.slice(0, limit);

    return (
        <div className="flex flex-1 flex-col gap-4 rounded-xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)] p-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                    Projects Directory
                </h3>
                <span className="text-[10px] font-medium text-[var(--text-muted-color)]">
                    Showing {shown.length} latest projects
                </span>
            </div>
            <div
                className={
                    variant === 'cards'
                        ? '@container grid grid-cols-1 gap-4'
                        : 'grid grid-cols-1 gap-1'
                }
            >
                {shown.length > 0 ? (
                    <>
                        {shown.map((project, index) => (
                            <RowReveal key={project.id} index={index}>
                                {variant === 'compact' ? (
                                    <CompactProjectRow project={project} />
                                ) : (
                                    <ProjectCard project={project} />
                                )}
                            </RowReveal>
                        ))}
                        {projects.length > limit && (
                            <Link
                                href="/projects"
                                className="cursor-pointer rounded-lg border border-dashed border-[var(--bg-light-color)] py-2.5 text-center text-xs font-semibold text-[var(--text-muted-color)] transition-colors hover:text-[var(--text-color)]"
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
    const counts = project.issue_counts;
    const total = counts ? counts.todo + counts.in_progress + counts.done : 0;
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
                {total} issues
            </span>
        </Link>
    );
};

export default ProjectsDirectoryPanel;
