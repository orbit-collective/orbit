import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import { useShortcuts } from '@/context/ShortcutContext';
import { ProjectCardProps } from '@/types/Components';
import { getColorTheme } from '@/utils/colors';
import { Link } from '@inertiajs/react';
import { FC } from 'react';
import Icon from '../../Atoms/Icon/Icon';

const ProjectCard: FC<ProjectCardProps> = ({ project, issues }) => {
    const projectIssues = issues.filter((i) => i.project_id === project.id);
    const totalIssuesCount = projectIssues.length;
    const closedIssuesCount = projectIssues.filter(
        (i) => i.status === 'closed',
    ).length;
    const openIssuesCount = totalIssuesCount - closedIssuesCount;
    const completionRate =
        totalIssuesCount > 0
            ? Math.round((closedIssuesCount / totalIssuesCount) * 100)
            : 0;

    const theme = getColorTheme(project.color);

    return (
        <Link
            href={`/projects/${project.id}`}
            className={`group flex flex-col justify-between rounded-lg border border-solid border-[var(--bg-light-color)] bg-[var(--bg-dark-color)] bg-gradient-to-br p-4 sm:p-5 ${theme.gradient} transition-all duration-300 ${theme.border} hover:-translate-y-0.5 hover:shadow-lg`}
        >
            <div>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${theme.accent}`}
                        />
                        <h4
                            className={`overflow-hidden overflow-ellipsis whitespace-nowrap text-base font-semibold ${theme.textGroupHover}`}
                        >
                            {project.name}
                        </h4>
                    </div>
                    <div className="shrink-0 rounded bg-[var(--bg-light-color)] p-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                        <Icon
                            name="ArrowRight"
                            size={12}
                            className="text-[var(--text-gray-color)] group-hover:text-[var(--text-color)]"
                        />
                    </div>
                </div>
                <p className="mt-2.5 line-clamp-2 min-h-[2rem] break-all text-xs leading-relaxed text-[var(--text-gray-color)]">
                    {project.description || 'No description provided.'}
                </p>
            </div>
            <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-gray-color)]">
                    <span className="font-semibold text-[var(--text-color)]">
                        {completionRate}% Completed
                    </span>
                    <span className="ml-2 whitespace-nowrap text-[var(--text-muted-color)]">
                        {closedIssuesCount}/{totalIssuesCount} Issues
                    </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--bg-light-color)]">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${theme.accent}`}
                        style={{ width: `${completionRate}%` }}
                    />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-solid border-[var(--border-color-strong)] pt-3.5 text-[11px]">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1.5 whitespace-nowrap text-[var(--text-gray-color)]">
                            <StatusDot status={'open'} />
                            {openIssuesCount} Open
                        </span>
                        <span className="flex items-center gap-1.5 whitespace-nowrap text-[var(--text-gray-color)]">
                            <StatusDot status={'closed'} />
                            {closedIssuesCount} Closed
                        </span>
                    </div>
                    <span
                        className="inline-block max-w-[70px] truncate rounded bg-[var(--bg-light-color)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted-color)] sm:max-w-[100px]"
                        title={project.slug}
                    >
                        {project.slug}
                    </span>
                </div>
            </div>
        </Link>
    );
};
export function ProjectNewCard() {
    const { triggerShortcut } = useShortcuts();

    return (
        <Link
            className="group flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--bg-light-color)] bg-transparent transition-all duration-300 hover:border-[var(--accent-color)] hover:bg-[var(--accent-color-opacity)]"
            onClick={(e) => {
                e.preventDefault();
                triggerShortcut('p');
            }}
        >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-[var(--bg-light-color)] transition-all duration-300 group-hover:border-[var(--accent-color)] group-hover:bg-[var(--accent-color-opacity)]">
                <Icon
                    name="Plus"
                    size={18}
                    className="text-[var(--text-muted-color)] transition-colors duration-200 group-hover:text-[var(--accent-color)]"
                />
            </div>
            <span className="text-xs font-semibold text-[var(--text-muted-color)] transition-colors duration-200 group-hover:text-[var(--accent-color)]">
                New Project
            </span>
        </Link>
    );
}

export default ProjectCard;
