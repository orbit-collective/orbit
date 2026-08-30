import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import { useShortcuts } from '@/context/ShortcutContext';
import { ProjectCardProps } from '@/types/Components';
import { getColorTheme } from '@/utils/colors';
import { Link } from '@inertiajs/react';
import { FC } from 'react';
import Icon from '../../Atoms/Icon/Icon';
import ProgressRing from '../../Atoms/ProgressRing/ProgressRing';

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
            className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--border-color-strong)] hover:bg-[var(--bg-light-color-hover)] sm:p-5"
        >
            <span
                aria-hidden="true"
                className={`absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-[0.12] blur-2xl ${theme.accent}`}
            />

            <div className="relative flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.badgeBg}`}
                    >
                        <Icon
                            name="FolderGit2"
                            size={18}
                            className={theme.iconText}
                        />
                    </span>
                    <div className="min-w-0">
                        <h4
                            className={`truncate text-base font-semibold text-[var(--text-color)] ${theme.textGroupHover}`}
                        >
                            {project.name}
                        </h4>
                        <span
                            className="block truncate text-[11px] font-medium text-[var(--text-muted-color)]"
                            title={project.slug}
                        >
                            {project.slug}
                        </span>
                    </div>
                </div>
                <div className="shrink-0 rounded bg-[var(--bg-light-color)] p-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                    <Icon
                        name="ArrowRight"
                        size={12}
                        className="text-[var(--text-gray-color)] group-hover:text-[var(--text-color)]"
                    />
                </div>
            </div>

            <p className="relative line-clamp-2 min-h-[2rem] break-all text-xs leading-relaxed text-[var(--text-gray-color)]">
                {project.description || 'No description provided.'}
            </p>

            <div className="relative mt-auto flex items-center gap-4 border-t border-solid border-[var(--border-color)] pt-3.5">
                <div className="relative flex shrink-0 items-center justify-center">
                    <ProgressRing
                        radius={22}
                        stroke={4}
                        progress={completionRate}
                        colorClass={theme.ring}
                        bgColorClass="stroke-[var(--bg-light-color)]"
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[var(--text-color)]">
                        {completionRate}%
                    </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-[var(--text-gray-color)]">
                            <StatusDot status={'open'} />
                            Open
                        </span>
                        <span className="font-semibold text-[var(--text-color)]">
                            {openIssuesCount}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-[var(--text-gray-color)]">
                            <StatusDot status={'closed'} />
                            Closed
                        </span>
                        <span className="font-semibold text-[var(--text-color)]">
                            {closedIssuesCount}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[var(--text-muted-color)]">
                        <span>Total</span>
                        <span className="font-semibold text-[var(--text-color)]">
                            {closedIssuesCount}/{totalIssuesCount} Issues
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
};
export function ProjectNewCard() {
    const { triggerShortcut } = useShortcuts();

    return (
        <Link
            className="group flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--bg-light-color)] bg-transparent transition-all duration-300 hover:border-[var(--accent-color)] hover:bg-[var(--accent-color-opacity)]"
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
