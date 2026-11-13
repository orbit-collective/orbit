import { Link } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { FC } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import { useCommandPalette } from '@/context/CommandContext';
import { ProjectCardProps } from '@/types/Components';
import { getColorTheme } from '@/utils/colors';
import Icon from '../../Atoms/Icon/Icon';
import ProgressRing from '../../Atoms/ProgressRing/ProgressRing';

const NO_ISSUES = { todo: 0, in_progress: 0, done: 0 };

const ProjectCard: FC<ProjectCardProps> = ({ project }) => {
    const { t } = useLaravelReactI18n();
    const { todo, in_progress, done } = project.issue_counts ?? NO_ISSUES;
    const totalIssuesCount = todo + in_progress + done;
    const completionRate =
        totalIssuesCount > 0 ? Math.round((done / totalIssuesCount) * 100) : 0;

    const theme = getColorTheme(project.color);

    return (
        <Link
            href={`/projects/${project.id}`}
            className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-(--border-color) bg-(--surface-color) p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-(--border-color-strong) hover:bg-(--bg-light-color-hover) sm:p-5"
        >
            <span
                aria-hidden="true"
                className={`absolute -top-10 -right-8 h-28 w-28 rounded-full opacity-[0.12] blur-2xl ${theme.accent}`}
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
                            className={`truncate text-base font-semibold text-(--text-color) ${theme.textGroupHover}`}
                        >
                            {project.name}
                        </h4>
                        <span
                            className="block truncate text-[11px] font-medium text-(--text-muted-color)"
                            title={project.slug}
                        >
                            {project.slug}
                        </span>
                    </div>
                </div>
                <div className="shrink-0 rounded-sm bg-(--bg-light-color) p-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                    <Icon
                        name="ArrowRight"
                        size={12}
                        className="text-(--text-gray-color) group-hover:text-(--text-color)"
                    />
                </div>
            </div>

            <p className="relative line-clamp-2 min-h-8 text-xs leading-relaxed break-all text-(--text-gray-color)">
                {project.description || t('project_card.no_description')}
            </p>

            <div className="relative mt-auto flex items-center gap-4 border-t border-(--border-color) pt-3.5">
                <div className="relative flex shrink-0 items-center justify-center">
                    <ProgressRing
                        radius={22}
                        stroke={4}
                        progress={completionRate}
                        colorClass={theme.ring}
                        bgColorClass="stroke-(--bg-light-color)"
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-(--text-color)">
                        <AnimatedNumber
                            value={completionRate}
                            format={(n) => `${Math.round(n)}%`}
                        />
                    </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-(--text-gray-color)">
                            <StatusDot status={'todo'} />
                            {t('project_card.status.todo')}
                        </span>
                        <span className="font-semibold text-(--text-color)">
                            <AnimatedNumber value={todo} />
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-(--text-gray-color)">
                            <StatusDot status={'in_progress'} />
                            {t('project_card.status.in_progress')}
                        </span>
                        <span className="font-semibold text-(--text-color)">
                            <AnimatedNumber value={in_progress} />
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-(--text-gray-color)">
                            <StatusDot status={'done'} />
                            {t('project_card.status.done')}
                        </span>
                        <span className="font-semibold text-(--text-color)">
                            <AnimatedNumber value={done} />
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-(--text-muted-color)">
                        <span>{t('project_card.total')}</span>
                        <span className="font-semibold text-(--text-color)">
                            <AnimatedNumber
                                value={done}
                                format={(n) =>
                                    t('project_card.total_issues', {
                                        done: Math.round(n),
                                        total: totalIssuesCount,
                                    })
                                }
                            />
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
};
export function ProjectNewCard() {
    const { t } = useLaravelReactI18n();
    const { runCommand } = useCommandPalette();

    return (
        <Link
            className="group flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-(--bg-light-color) bg-transparent transition-all duration-300 hover:border-(--accent-color) hover:bg-(--accent-color-opacity)"
            onClick={(e) => {
                e.preventDefault();
                runCommand('project.create');
            }}
        >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-(--bg-light-color) transition-all duration-300 group-hover:border-(--accent-color) group-hover:bg-(--accent-color-opacity)">
                <Icon
                    name="Plus"
                    size={18}
                    className="text-(--text-muted-color) transition-[color,transform] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-90 group-hover:text-(--accent-color)"
                />
            </div>
            <span className="text-xs font-semibold text-(--text-muted-color) transition-colors duration-200 group-hover:text-(--accent-color)">
                {t('project_card.new_project')}
            </span>
        </Link>
    );
}

export default ProjectCard;
